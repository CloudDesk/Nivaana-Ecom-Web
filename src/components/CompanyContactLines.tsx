import { company } from "../config/company.config";

// The contact lines inside the grey box at the end of each policy page.
// Renders only the <p> lines; the page keeps its own wrapper and spacing.
export default function CompanyContactLines({ showHours = false }: { showHours?: boolean }) {
  return (
    <>
      <p><strong>{company.legalName}</strong></p>
      <p>{company.address.line1}</p>
      <p>{company.address.line2}</p>
      <p>{company.address.cityLine}</p>
      <p>Phone: {company.phone}</p>
      <p>Email: {company.email}</p>
      {showHours && <p>Customer Service Hours: {company.serviceHours}</p>}
    </>
  );
}
