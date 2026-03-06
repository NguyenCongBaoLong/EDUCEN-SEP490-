using EducenAPI.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EduCenAPI.Tests.Fakes
{
    internal class FakeTenantService : ICurrentTenantService
    {

        public string? TenantId { get; set; } = "1";

        public string? ConnectionString { get; set; } = "FakeConnection";

        public Task<bool> SetTenant(string tenant)
        {
            TenantId = tenant;
            return Task.FromResult(true);
        }
    }
}