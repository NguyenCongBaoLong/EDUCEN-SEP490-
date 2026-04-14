namespace EducenAPI.Exceptions
{
    public class TenantLockedException : Exception
    {
        public TenantLockedException(string message) : base(message)
        {
        }

        public TenantLockedException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}