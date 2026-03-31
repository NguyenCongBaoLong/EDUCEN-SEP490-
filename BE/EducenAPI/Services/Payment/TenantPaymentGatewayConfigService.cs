using System.Text.Json;
using EducenAPI.Exceptions;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EducenAPI.Services.Payment
{
    public class TenantPaymentGatewayConfigService : ITenantPaymentGatewayConfigService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly IConfiguration _configuration;
        private readonly PaymentConfigResolutionOptions _resolutionOptions;

        public TenantPaymentGatewayConfigService(
            AdminDbContext adminDbContext,
            IConfiguration configuration,
            IOptions<PaymentConfigResolutionOptions> resolutionOptions)
        {
            _adminDbContext = adminDbContext;
            _configuration = configuration;
            _resolutionOptions = resolutionOptions.Value;
        }

        public async Task<EffectivePaymentGatewayConfig> GetEffectiveConfigAsync(string tenantId, string gatewayType = "VNPay")
        {
            if (string.IsNullOrWhiteSpace(tenantId))
            {
                throw new BadRequestException("Tenant ID is required to resolve payment gateway config.");
            }

            var normalizedGatewayType = NormalizeGatewayType(gatewayType);

            var tenantConfig = await _adminDbContext.TenantPaymentGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c =>
                    c.TenantId == tenantId &&
                    c.GatewayType == normalizedGatewayType &&
                    c.Status == "Active" &&
                    !c.IsDeleted);

            if (tenantConfig != null)
            {
                var parsedConfig = ParseTenantConfig(tenantConfig.ConfigData, tenantId, normalizedGatewayType);
                ValidateRequiredFields(parsedConfig, tenantId, normalizedGatewayType, PaymentConfigSources.TenantConfig);
                return parsedConfig;
            }

            if (_resolutionOptions.EnableGlobalFallback)
            {
                var fallbackConfig = BuildGlobalFallbackConfig(normalizedGatewayType);
                ValidateRequiredFields(fallbackConfig, tenantId, normalizedGatewayType, PaymentConfigSources.GlobalFallback);
                return fallbackConfig;
            }

            throw new NotFoundException(
                $"No active payment gateway config found for tenant '{tenantId}' and gateway '{normalizedGatewayType}'. Global fallback is disabled.");
        }

        public EffectivePaymentGatewayConfig GetGlobalConfig(string gatewayType = "VNPay")
        {
            var normalizedGatewayType = NormalizeGatewayType(gatewayType);
            var config = BuildGlobalFallbackConfig(normalizedGatewayType);
            ValidateRequiredFields(config, "global", normalizedGatewayType, PaymentConfigSources.GlobalFallback);
            return config;
        }

        private EffectivePaymentGatewayConfig ParseTenantConfig(string configData, string tenantId, string gatewayType)
        {
            if (string.IsNullOrWhiteSpace(configData))
            {
                throw new BadRequestException(
                    $"Tenant payment gateway config is empty for tenant '{tenantId}' and gateway '{gatewayType}'.");
            }

            try
            {
                using var document = JsonDocument.Parse(configData);
                var root = document.RootElement;

                return new EffectivePaymentGatewayConfig
                {
                    GatewayType = gatewayType,
                    TmnCode = GetJsonValueIgnoreCase(root, "TmnCode"),
                    HashSecret = GetJsonValueIgnoreCase(root, "HashSecret"),
                    BaseUrl = GetJsonValueIgnoreCase(root, "BaseUrl"),
                    ApiUrl = GetJsonValueIgnoreCase(root, "ApiUrl"),
                    ReturnUrl = GetJsonValueIgnoreCase(root, "ReturnUrl"),
                    FrontendReturnUrl = GetJsonValueIgnoreCase(root, "FrontendReturnUrl"),
                    IpnUrl = GetJsonValueIgnoreCase(root, "IpnUrl"),
                    Source = PaymentConfigSources.TenantConfig
                };
            }
            catch (JsonException ex)
            {
                throw new BadRequestException(
                    $"Tenant payment gateway config has invalid JSON format for tenant '{tenantId}' and gateway '{gatewayType}'.",
                    ex);
            }
        }

        private EffectivePaymentGatewayConfig BuildGlobalFallbackConfig(string gatewayType)
        {
            var sectionPath = $"PaymentGateways:{gatewayType}";

            return new EffectivePaymentGatewayConfig
            {
                GatewayType = gatewayType,
                TmnCode = _configuration[$"{sectionPath}:TmnCode"] ?? string.Empty,
                HashSecret = _configuration[$"{sectionPath}:HashSecret"] ?? string.Empty,
                BaseUrl = _configuration[$"{sectionPath}:BaseUrl"] ?? string.Empty,
                ApiUrl = _configuration[$"{sectionPath}:ApiUrl"] ?? string.Empty,
                ReturnUrl = _configuration[$"{sectionPath}:ReturnUrl"] ?? string.Empty,
                FrontendReturnUrl = _configuration[$"{sectionPath}:FrontendReturnUrl"] ?? string.Empty,
                IpnUrl = _configuration[$"{sectionPath}:IpnUrl"] ?? string.Empty,
                Source = PaymentConfigSources.GlobalFallback
            };
        }

        private static string NormalizeGatewayType(string gatewayType)
        {
            var normalized = gatewayType?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(normalized))
            {
                return "VNPay";
            }

            if (normalized.Equals("VNPay", StringComparison.OrdinalIgnoreCase))
            {
                return "VNPay";
            }

            throw new BadRequestException($"Unsupported payment gateway type '{gatewayType}'.");
        }

        private static string GetJsonValueIgnoreCase(JsonElement root, string propertyName)
        {
            if (root.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }

            foreach (var property in root.EnumerateObject())
            {
                if (property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    return property.Value.GetString() ?? string.Empty;
                }
            }

            return string.Empty;
        }

        private static void ValidateRequiredFields(
            EffectivePaymentGatewayConfig config,
            string tenantId,
            string gatewayType,
            string source)
        {
            var missingFields = new List<string>();

            if (string.IsNullOrWhiteSpace(config.TmnCode)) missingFields.Add(nameof(config.TmnCode));
            if (string.IsNullOrWhiteSpace(config.HashSecret)) missingFields.Add(nameof(config.HashSecret));
            if (string.IsNullOrWhiteSpace(config.BaseUrl)) missingFields.Add(nameof(config.BaseUrl));
            if (string.IsNullOrWhiteSpace(config.ApiUrl)) missingFields.Add(nameof(config.ApiUrl));
            if (string.IsNullOrWhiteSpace(config.ReturnUrl)) missingFields.Add(nameof(config.ReturnUrl));
            if (string.IsNullOrWhiteSpace(config.FrontendReturnUrl)) missingFields.Add(nameof(config.FrontendReturnUrl));
            if (string.IsNullOrWhiteSpace(config.IpnUrl)) missingFields.Add(nameof(config.IpnUrl));

            if (missingFields.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Resolved payment config is invalid from source '{source}' for tenant '{tenantId}', gateway '{gatewayType}'. Missing: {string.Join(", ", missingFields)}.");
            }
        }
    }
}
