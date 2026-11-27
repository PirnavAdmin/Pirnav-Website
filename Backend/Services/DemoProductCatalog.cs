namespace Pirnav.API.Services
{
    public record DemoProductInfo(string Id, string ShortName, string Title, string Category);

    public static class DemoProductCatalog
    {
        public static readonly IReadOnlyList<DemoProductInfo> All = new List<DemoProductInfo>
        {
            new("peoplehrsync", "PeopleHRSync", "PeopleHRSync — Modern HRMS SaaS", "Modern HRMS SaaS"),
            new("pulseleef", "PulseLeef", "PulseLeef — Healthcare & Clinical Suite", "Healthcare & Medical"),
            new("pupil-scholar", "Pupil Scholar", "Pupil Scholar — Education & Campus ERP", "Education & Campus ERP"),
            new("pupil-scholar-inter", "Pupil Scholar Inter", "Pupil Scholar — Inter College ERP", "Intermediate College ERP"),
            new("pupil-scholar-btech", "Pupil Scholar B.Tech", "Pupil Scholar — B.Tech Engineering ERP", "Engineering College ERP"),
            new("kini-edx", "KINI", "Kini — KiniEdx Learning Platform", "EdTech & Learning"),
            new("curecode-bug-tracker", "CureCode", "CureCode — Agile Bug Tracker & QA Suite", "Developer Tools & QA"),
            new("inventory-management", "Inventory Management", "Inventory Management — Warehouse & Stock ERP", "Inventory & Supply"),
            new("canteen-management", "Canteen Management", "Canteen Management — Multi-Outlet Order & Menu Suite", "Campus & Canteen"),
            new("invoice-billing", "Invoice & Billing", "Invoice & Billing — Multi-Tenant IBMS Suite", "Finance & Billing"),
            new("pick-and-book", "Pick&Book", "Pick&Book — Travel & Reservation Platform", "Travel & Booking Platform"),
            new("hotel-management", "Hotel Management", "Hotel Management — Restaurant Table Billing & POS", "Hospitality & Dining")
        };

        private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
        {
            ["kini"] = "kini-edx",
            ["kiniedx"] = "kini-edx",
            ["curecode"] = "curecode-bug-tracker",
            ["pupil"] = "pupil-scholar",
            ["cms-inter"] = "pupil-scholar-inter",
            ["inter"] = "pupil-scholar-inter",
            ["cms-btech"] = "pupil-scholar-btech",
            ["btech"] = "pupil-scholar-btech",
            ["ims"] = "inventory-management",
            ["inventory"] = "inventory-management",
            ["canteen"] = "canteen-management",
            ["ibms"] = "invoice-billing",
            ["invoice"] = "invoice-billing",
            ["pick&book"] = "pick-and-book",
            ["pick-n-book"] = "pick-and-book",
            ["picknbook"] = "pick-and-book",
            ["pnb"] = "pick-and-book",
            ["hotel"] = "hotel-management",
            ["hms"] = "hotel-management"
        };

        public static readonly IReadOnlyList<string> ValidStatuses = new[]
        {
            "New",
            "Contacted",
            "Demo Scheduled",
            "Demo Completed",
            "Qualified",
            "Converted",
            "Lost"
        };

        public static DemoProductInfo? Resolve(string? productIdOrTitle)
        {
            if (string.IsNullOrWhiteSpace(productIdOrTitle))
                return null;

            var input = productIdOrTitle.Trim();
            if (Aliases.TryGetValue(input, out var mappedId))
                input = mappedId;

            return All.FirstOrDefault(p =>
                string.Equals(p.Id, input, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.ShortName, input, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Title, input, StringComparison.OrdinalIgnoreCase));
        }

        public static bool IsValidStatus(string? status, out string canonical)
        {
            canonical = string.Empty;
            if (string.IsNullOrWhiteSpace(status))
                return false;

            var match = ValidStatuses.FirstOrDefault(s =>
                string.Equals(s, status.Trim(), StringComparison.OrdinalIgnoreCase));

            if (match == null)
                return false;

            canonical = match;
            return true;
        }
    }
}
