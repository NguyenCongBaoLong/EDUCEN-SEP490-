namespace EducenAPI.DTOs.Parents
{
    public class ChildInfoDto
    {
        public int StudentId { get; set; }
        public string FullName { get; set; } = "";
        public string? Username { get; set; }
        public string? Grade { get; set; }
        public string? Gender { get; set; }
        public string? EnrollmentStatus { get; set; }

        public string Initials
        {
            get
            {
                if (string.IsNullOrWhiteSpace(FullName)) return "?";
                var parts = FullName.Trim().Split(' ');
                var lastPart = parts[parts.Length - 1];
                return lastPart.Length > 0 ? lastPart[0].ToString().ToUpper() : "?";
            }
        }
    }
}
