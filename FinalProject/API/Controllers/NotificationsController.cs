using System.Security.Claims;
using FinalProject.Application.Dto.Notification;
using FinalProject.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinalProject.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        //[Authorize(Roles = "Admin,Librarian")]
        [HttpGet]
        public async Task<IActionResult> GetAllNotifications()
        {
            var notifications = await _notificationService.GetAllNotificationsAsync();
            return Ok(notifications);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetNotificationById(int id)
        {
            var notification = await _notificationService.GetNotificationByIdAsync(id);
            if (notification == null) return NotFound();
            return Ok(notification);
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost]
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationDto createDto)
        {
            await _notificationService.AddNotificationAsync(createDto);
            return CreatedAtAction(nameof(GetNotificationById), new { id = createDto.MemberID }, createDto);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            await _notificationService.DeleteNotificationAsync(id);
            return NoContent();
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("member/{memberId}")]
        public async Task<IActionResult> GetNotificationsForMember(int memberId)
        {
            var notifications = await _notificationService.GetNotificationsForMemberAsync(memberId);
            return Ok(notifications);
        }
      
        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost("notify-overdue-books")]
        public async Task<IActionResult> NotifyForOverdueBooks()
        {
            await _notificationService.NotifyForOverdueBooksAsync();
            return Ok(new { Message = "Notifications for overdue books sent successfully." });
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost("notify-fine-payment/{fineId}")]
        public async Task<IActionResult> NotifyForFinePayment(int fineId)
        {
            await _notificationService.NotifyForFinePaymentAsync(fineId);
            return Ok(new { Message = "Notification for fine payment sent successfully." });
        }


        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("approaching-fines")]
        public async Task<IActionResult> GetApproachingFineNotifications()
        {
            var memberId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value); // Get logged-in user's ID
            var notifications = await _notificationService.GetApproachingFineNotificationsAsync(memberId);

            return Ok(notifications);
        }
    }
}
