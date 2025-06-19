using FinalProject.Application.Dto.BorrowingTransaction;

namespace FinalProject.Application.Interfaces
{
    public interface IBorrowingTransactionService
    {
        Task<IEnumerable<BorrowingTransactionDto>> GetAllTransactionsAsync();
        Task<BorrowingTransactionDto> GetTransactionByIdAsync(int transactionId);
        Task AddTransactionAsync(BorrowBookDto borrowDto);
        Task ReturnBookAsync(ReturnBookDto returnDto);
        Task<IEnumerable<BorrowingTransactionDto>> GetOverdueBooksAsync();
        Task<IEnumerable<BorrowingTransactionDto>> GetMemberBorrowHistoryAsync(int memberId);
        Task<IEnumerable<BorrowingTransactionDto>> GetTransactionsByMemberNameAsync(string name);
        Task UpdateTransactionAsync(int transactionId, UpdateBorrowingTransactionDto updateDto);
        Task DeleteTransactionAsync(int transactionId);

        //Task DeleteTransactionByIdAsync(int transactionId); //doubt
    }
}
