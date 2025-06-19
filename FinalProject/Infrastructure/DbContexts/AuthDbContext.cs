using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using FinalProject.Domain;
using System.Reflection.Emit;

namespace FinalProject.Infrastructure.DbContexts
{
    public class AuthDbContext : IdentityDbContext<IdentityUser>
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            var adminRoleId = "1"; // Unique ID for Admin role
            var librarianRoleId = "2"; // Unique ID for Librarian role
            var userRoleId = "3";  // Unique ID for User role

            builder.Entity<IdentityRole>().HasData(
                new IdentityRole
                {
                    Id = adminRoleId,
                    Name = "Admin",
                    NormalizedName = "ADMIN"
                },
                new IdentityRole
                {
                    Id = librarianRoleId,
                    Name = "Librarian",
                    NormalizedName = "LIBRARIAN"
                },
                new IdentityRole
                {
                    Id = userRoleId,
                    Name = "User",
                    NormalizedName = "USER"
                }
            );

            // Seed Member
            var adminUserId = "1"; // Unique ID for Admin user
            var librarianUserId = "2"; // Unique ID for Librarian user
            var userUserId = "3"; // Unique ID for User user
            var hasher = new PasswordHasher<IdentityUser>();


            builder.Entity<IdentityUser>().HasData(
                new IdentityUser
                {
                    Id = adminUserId,
                    UserName = "admin@library.com",
                    NormalizedUserName = "ADMIN@LIBRARY.COM",
                    Email = "admin@library.com",
                    NormalizedEmail = "ADMIN@LIBRARY.COM",
                    EmailConfirmed = true,
                    PasswordHash = hasher.HashPassword(null, "Admin@123"), // Default password
                    SecurityStamp = string.Empty
                },
                new IdentityUser
                {
                    Id = librarianUserId,
                    UserName = "librarian@library.com",
                    NormalizedUserName = "LIBRARIAN@LIBRARY.COM",
                    Email = "librarian@library.com",
                    NormalizedEmail = "LIBRARIAN@LIBRARY.COM",
                    EmailConfirmed = true,
                    PasswordHash = hasher.HashPassword(null, "Librarian@123"), // Default password
                    SecurityStamp = string.Empty
                },
                new IdentityUser
                {
                    Id = userUserId,
                    UserName = "user@library.com",
                    NormalizedUserName = "USER@LIBRARY.COM",
                    Email = "user@library.com",
                    NormalizedEmail = "USER@LIBRARY.COM",
                    EmailConfirmed = true,
                    PasswordHash = hasher.HashPassword(null, "User@123"), // Default password
                    SecurityStamp = string.Empty
                }
            );

            // Assign Admin Role to Admin User
            builder.Entity<IdentityUserRole<string>>().HasData(
                new IdentityUserRole<string>
                {
                    RoleId = adminRoleId,
                    UserId = adminUserId
                },
                new IdentityUserRole<string>
                {
                    RoleId = librarianRoleId,
                    UserId = librarianUserId
                },
                new IdentityUserRole<string>
                {
                    RoleId = userRoleId,
                    UserId = userUserId
                }
            );

            // Ignore other application-specific entities
            builder.Ignore<Member>();
            builder.Ignore<Book>();
            builder.Ignore<BorrowingTransaction>();
            builder.Ignore<Fine>();
            builder.Ignore<Notification>();
        }
    }
}