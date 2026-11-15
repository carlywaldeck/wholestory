/** Browser-only PDF export. The report text never leaves this device. */
export async function downloadMonthlyBrief(text:string,month:string) {
  const {jsPDF}=await import("jspdf");
  const pdf=new jsPDF();let y=20;
  const printable=text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,"-");
  for(const paragraph of printable.split("\n")){
    // Keep each source label with the start of its original entry.
    if(/^\[\d+\]/.test(paragraph)&&y>255){pdf.addPage();y=20;}
    pdf.setFont("helvetica","normal");pdf.setFontSize(10);
    for(const line of pdf.splitTextToSize(paragraph||" ",174)){
      if(y>275){pdf.addPage();y=20;}
      pdf.text(line,18,y);y+=5;
    }
  }
  pdf.save(`elya-appointment-brief-${month}.pdf`);
}
