using Microsoft.EntityFrameworkCore;
using FinalProject.Domain;

namespace FinalProject.Infrastructure.DbContexts
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        { }
        public DbSet<Book> Books { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<BorrowingTransaction> BorrowingTransactions { get; set; }
        public DbSet<Fine> Fines { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure one-to-many relationship between Book and BorrowingTransaction
            modelBuilder.Entity<BorrowingTransaction>()
                .HasOne(bt => bt.Book)
                .WithMany(b => b.BorrowingTransactions)
                .HasForeignKey(bt => bt.BookID);


            // Configure one-to-many relationship between Member and BorrowingTransaction
            modelBuilder.Entity<BorrowingTransaction>()
                .HasOne(bt => bt.Member)
                .WithMany(m => m.BorrowingTransactions)
                .HasForeignKey(bt => bt.MemberID);

            modelBuilder.Entity<Member>().HasData(
                new Member
                {
                    MemberID = 1,
                    Name = "Admin",
                    Email = "admin@library.com",
                    Phone = "1234567890",
                    Address = "Admin Address",
                    MembershipStatus = "Active"
                }, 
                new Member
                {
                    MemberID = 2,
                    Name = "Librarian",
                    Email = "librarian@library.com",
                    Phone = "0987654321",
                    Address = "Librarian Address",
                    MembershipStatus = "Active"
                },
                new Member
                {
                    MemberID = 3,
                    Name = "User",
                    Email = "user@library.com",
                    Phone = "1122334455",
                    Address = "User Address",
                    MembershipStatus = "Active"
                }
            );
            // Configure one-to-many relationship between Member and Fine
            modelBuilder.Entity<Fine>()
                .HasOne(f => f.Member)
                .WithMany(m => m.Fines)
                .HasForeignKey(f => f.MemberID)
                .HasPrincipalKey(m => m.MemberID);

            // Configure one-to-many relationship between Member and Notification
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Member)
                .WithMany(m => m.Notifications)
                .HasForeignKey(n => n.MemberID);


        }
    }
}