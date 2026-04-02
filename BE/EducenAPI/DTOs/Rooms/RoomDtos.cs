using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Rooms
{
    public class RoomDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public bool Status { get; set; }
    }

    public class CreateRoomDto
    {
        [Required(ErrorMessage = "Tên phòng là bắt buộc.")]
        [StringLength(100, ErrorMessage = "Tên phòng không được vượt quá 100 ký tự.")]
        public string RoomName { get; set; } = string.Empty;
        public bool Status { get; set; } = true;
    }

    public class UpdateRoomDto : CreateRoomDto
    {
    }
}
