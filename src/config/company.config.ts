// Company details shown in the footer, About Us and policy pages.
// Change a value here and every page that shows it updates.
export const company = {
  legalName: "VIP98 VENTURES LLP",
  address: {
    line1: "516D, Lakshmi Sundaram Nagar",
    line2: "Narasingapuram Road, Pandiyanallore Post",
    cityLine: "Sholinghur - 631102, Tamil Nadu",
  },
  phone: "+91 8925662553",
  email: "ReachUs@nivaana.in",
  website: "https://nivaana.in",
  serviceHours: "9 AM - 6 PM (Mon-Sat)",
  jurisdiction: "Tamil Nadu, India",
};

export const companyAddressFull = [company.address.line1, company.address.line2, company.address.cityLine].join(", ");

export type CompanyConfig = typeof company;
