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
        public string RoomName { get; set; } = string.Empty;
        public bool Status { get; set; } = true;
    }

    public class UpdateRoomDto : CreateRoomDto
    {
    }
}
