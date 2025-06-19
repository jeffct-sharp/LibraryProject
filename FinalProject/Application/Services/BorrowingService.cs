using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.BorrowingTransaction;
using FinalProject.Domain;

namespace FinalProject.Application.Services
{
    public class BorrowingTransactionService : IBorrowingTransactionService
    {
        private readonly IBorrowingTransactionRepository _repository;
        private readonly IBookRepository _bookRepository;
        private readonly IMemberRepository _memberRepository;
        private readonly INotificationService _notificationService;
        private readonly IFineRepository _fineRepository;

        public BorrowingTransactionService(
            IBorrowingTransactionRepository repository,
            IBookRepository bookRepository,
            IMemberRepository memberRepository,
            INotificationService notificationService,
            IFineRepository fineRepository)
        {
            _repository = repository;
            _bookRepository = bookRepository;
            _memberRepository = memberRepository;
            _notificationService = notificationService;
            _fineRepository = fineRepository;
        }

        public async Task<IEnumerable<BorrowingTransactionDto>> GetAllTransactionsAsync()
        {
            var transactions = await _repository.GetAllTransactionsAsync();
            var book = await _bookRepository.GetAllBooksAsync();

            return transactions.Select(t => new BorrowingTransactionDto
            {
                TransactionID = t.TransactionID,
                BookID = t.BookID,
                BookName = book.FirstOrDefault(b => b.BookID == t.BookID)?.Title,
                MemberID = t.MemberID,
                BorrowDate = t.BorrowDate,
                ReturnDate = t.ReturnDate,
                Status = t.Status
            });
        }

        public async Task<BorrowingTransactionDto> GetTransactionByIdAsync(int transactionId)
        {
            var transaction = await _repository.GetTransactionByIdAsync(transactionId);
            var books = await _bookRepository.GetAllBooksAsync();
            if (transaction == null) return null;

            return new BorrowingTransactionDto
            {
                TransactionID = transaction.TransactionID,
                BookID = transaction.BookID,
                BookName = books.FirstOrDefault(b => b.BookID == transaction.BookID)?.Title,
                MemberID = transaction.MemberID,
                BorrowDate = transaction.BorrowDate,
                ReturnDate = transaction.ReturnDate,
                Status = transaction.Status
            };
        }

        public async Task AddTransactionAsync(BorrowBookDto borrowDto)
        {
            // Check if the member exists and is active  
            var member = await _memberRepository.GetMemberByIdAsync(borrowDto.MemberID);
            if (member == null || member.MembershipStatus != "Active")
                throw new InvalidOperationException("Member is not active or does not exist.");

            // Check if the member has overdue books  
            var overdueBooks = await _repository.GetOverdueBooksAsync();
            if (overdueBooks.Any(t => t.MemberID == borrowDto.MemberID))
                throw new InvalidOperationException("Member has overdue books.");

            // Check if the member has reached the max borrow limit  
            var memberBorrowCount = await _repository.GetMemberBorrowCountAsync(borrowDto.MemberID);
            if (memberBorrowCount >= 5)
                throw new InvalidOperationException("Member has reached the maximum borrow limit of 5 books.");

            // Check if the book exists and is available  
            var book = await _bookRepository.GetBookByIdAsync(borrowDto.BookID);
            if (book == null || book.AvailableCopies <= 0)
                throw new InvalidOperationException("Book is not available.");

            // Check if the member has already borrowed the same book  
            var existingTransaction = await _repository.GetActiveBorrowingTransactionAsync(memberID: borrowDto.MemberID, borrowDto.BookID);
            if (existingTransaction != null)
                throw new InvalidOperationException("Member has already borrowed this book.");

            // Create the borrowing transaction  
            var transaction = new BorrowingTransaction
            {
                BookID = borrowDto.BookID,
                MemberID = borrowDto.MemberID,
                BorrowDate = borrowDto.BorrowDate,
                ReturnDate = default(DateTime), 
                Status = "Borrowed"
            };

            // Update the book's available copies  
            book.AvailableCopies -= 1;
            await _bookRepository.UpdateBookAsync(book);

            await _repository.AddTransactionAsync(transaction);

            // Notify for membership status change if applicable  
            if (member.MembershipStatus == "Suspended")
            {
                await _notificationService.NotifyForMembershipStatusChangeAsync(member.MemberID, "Suspended");
            }
        }

        //public async Task ReturnBookAsync(ReturnBookDto returnDto)
        //{
        //    var transaction = await _repository.GetTransactionByIdAsync(returnDto.TransactionID);
        //    if (transaction == null || transaction.Status == "Returned")
        //        throw new InvalidOperationException("Transaction does not exist or the book has already been returned.");

        //    // Update the transaction status and return date
        //    transaction.Status = "Returned";
        //    transaction.ReturnDate = returnDto.ReturnDate;

        //    // Update the book's available copies
        //    var book = await _bookRepository.GetBookByIdAsync(transaction.BookID);
        //    if (book != null)
        //    {
        //        book.AvailableCopies += 1;
        //        await _bookRepository.UpdateBookAsync(book);
        //    }

        //    await _repository.UpdateTransactionAsync(transaction);
        //}


        // Automatically trigger overdue notifications
        public async Task ReturnBookAsync(ReturnBookDto returnDto)
        {
            var transaction = await _repository.GetTransactionByIdAsync(returnDto.TransactionID);
            if (transaction == null || transaction.Status == "Returned")
                throw new InvalidOperationException("Transaction does not exist or the book has already been returned.");

            var expectedReturnDate = transaction.BorrowDate.AddDays(14);
            var overdueDays = (DateTime.Now - expectedReturnDate).Days;

            if (overdueDays > 0)
            {
                decimal fineAmount = Math.Min(overdueDays * 10, 300); // ₹10 per day, capped at ₹300

                var existingFinesForMember = await _fineRepository.GetOutstandingFinesForMemberAsync(transaction.MemberID);
                bool fineAlreadyApplied = existingFinesForMember.Any(f =>
                    f.Status == "Pending" &&
                    f.Amount == fineAmount &&
                    f.TransactionDate.Date == DateTime.Now.Date);

                if (!fineAlreadyApplied)
                {
                    var member = await _memberRepository.GetMemberByIdAsync(transaction.MemberID);
                    if (member != null && member.MembershipStatus == "Suspended")
                    {
                        fineAmount += 200; // ₹200 of suspension revoke
                    }

                    var fine = new Fine
                    {
                        MemberID = transaction.MemberID,
                        Amount = fineAmount,
                        Status = "Pending",
                        TransactionDate = DateTime.Now
                    };

                    await _fineRepository.AddFineAsync(fine);
                    await _notificationService.NotifyForOverdueBooksAsync();
                }
            }

            transaction.Status = "Returned";
            transaction.ReturnDate = returnDto.ReturnDate;

            var book = await _bookRepository.GetBookByIdAsync(transaction.BookID);
            if (book != null)
            {
                book.AvailableCopies += 1;
                await _bookRepository.UpdateBookAsync(book);
            }

            await _repository.UpdateTransactionAsync(transaction);
        }


        public async Task<IEnumerable<BorrowingTransactionDto>> GetOverdueBooksAsync()
        {
            var overdueBooks = await _repository.GetOverdueBooksAsync();
            var book = await _bookRepository.GetAllBooksAsync();

            return overdueBooks.Select(t => new BorrowingTransactionDto
            {
                TransactionID = t.TransactionID,
                BookID = t.BookID,
                BookName = book.FirstOrDefault(b => b.BookID == t.BookID)?.Title,
                MemberID = t.MemberID,
                BorrowDate = t.BorrowDate,
                ReturnDate = t.ReturnDate,
                Status = t.Status
            });
        }
       
        public async Task<IEnumerable<BorrowingTransactionDto>> GetMemberBorrowHistoryAsync(int memberId)
        {
            var borrowHistory = await _repository.GetMemberBorrowHistoryAsync(memberId);
            var book = await _bookRepository.GetAllBooksAsync();

            return borrowHistory.Select(t => new BorrowingTransactionDto
            {
                TransactionID = t.TransactionID,
                BookID = t.BookID,
                BookName = book.FirstOrDefault(b => b.BookID == t.BookID)?.Title,
                MemberID = t.MemberID,
                BorrowDate = t.BorrowDate,
                ReturnDate = t.ReturnDate,
                Status = t.Status
            });
        }

        public async Task<IEnumerable<BorrowingTransactionDto>> GetTransactionsByMemberNameAsync(string name)
        {
            var transactions = await _repository.GetAllTransactionsAsync();
            var books = await _bookRepository.GetAllBooksAsync();
            var members = await _memberRepository.GetAllMembersAsync();

            return transactions
                .Where(t => members.Any(m => m.MemberID == t.MemberID && m.Name.Contains(name, StringComparison.OrdinalIgnoreCase)))
                .Select(t => new BorrowingTransactionDto
                {
                    TransactionID = t.TransactionID,
                    BookID = t.BookID,
                    BookName = books.FirstOrDefault(b => b.BookID == t.BookID)?.Title,
                    MemberID = t.MemberID,
                    BorrowDate = t.BorrowDate,
                    ReturnDate = t.ReturnDate,
                    Status = t.Status
                });
        }

        public async Task UpdateTransactionAsync(int transactionId, UpdateBorrowingTransactionDto updateDto)
        {
            var transaction = await _repository.GetTransactionByIdAsync(transactionId);
            if (transaction == null) throw new InvalidOperationException("Transaction not found.");

            transaction.BookID = updateDto.BookID;
            transaction.MemberID = updateDto.MemberID;
            transaction.BorrowDate = updateDto.BorrowDate;
            transaction.ReturnDate = updateDto.ReturnDate;
            transaction.Status = updateDto.Status;

            await _repository.UpdateTransactionAsync(transaction);
        }

        //public async Task DeleteTransactionByIdAsync(int memberId)
        //{
        //    var transaction = await _repository.GetMemberBorrowHistoryAsync(memberId);
        //    if (transaction == null) throw new InvalidOperationException("Transaction not found.");

        //    await _repository.DeleteTransactionAsync(memberId);
        //}
        public async Task DeleteTransactionAsync(int transactionId)
        {
            var transaction = await _repository.GetTransactionByIdAsync(transactionId);

            if (transaction != null && transaction.Status == "Returned")
            {
                await _repository.DeleteTransactionAsync(transactionId);
            }
            else
            {
                throw new InvalidOperationException("Transaction not found or book status is borrowed");
            }
        }
    }
}
