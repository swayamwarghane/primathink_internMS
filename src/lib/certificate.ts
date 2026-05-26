import jsPDF from "jspdf";

export interface CertificateData {
  name: string;
  domain: string;
  completionDate: Date;
  certificateId: string;
}

export function generateCertificate(d: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Outer border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(4);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(99, 102, 241);
  doc.text("PRIMA INTERNS", w / 2, 80, { align: "center" });

  doc.setFontSize(38);
  doc.setTextColor(15, 23, 42);
  doc.text("Certificate of Completion", w / 2, 140, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);
  doc.text("This is proudly presented to", w / 2, 190, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(15, 23, 42);
  doc.text(d.name, w / 2, 240, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);
  const body = `for successfully completing the internship program in ${d.domain},\nhaving demonstrated outstanding commitment and proficiency.`;
  doc.text(body, w / 2, 290, { align: "center" });

  // Footer
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Date: ${d.completionDate.toLocaleDateString()}`, 100, h - 90);
  doc.text(`Certificate ID: ${d.certificateId}`, w - 100, h - 90, { align: "right" });

  doc.setDrawColor(99, 102, 241);
  doc.line(w / 2 - 80, h - 110, w / 2 + 80, h - 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Prima Interns Program Director", w / 2, h - 90, { align: "center" });

  doc.save(`Certificate_${d.name.replace(/\s+/g, "_")}.pdf`);
}
