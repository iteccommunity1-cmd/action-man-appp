import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Extend jsPDF with autoTable type for TypeScript
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: {
            startY: number;
            head: string[][];
            body: (string | number)[][];
            theme: string;
            headStyles: {
                fillColor: number[];
                textColor: number[];
                fontSize: number;
                fontStyle: string;
            };
            bodyStyles: {
                fontSize: number;
            };
            alternateRowStyles: {
                fillColor: number[];
            };
            margin: { top: number };
        }) => jsPDF;
    }
}

export const exportAnalyticsToPdf = (
    title: string,
    headers: string[],
    data: (string | number)[][],
    filename: string
) => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd HH:mm');

    // Add Project Branding
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Deep Midnight Teal
    doc.text('Action Man Analytics', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 28);
    doc.text('---------------------------------------------------------', 14, 32);

    // Add Card Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 45);

    // Add Table
    doc.autoTable({
        startY: 55,
        head: [headers],
        body: data,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246], // primary blue
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
        },
        bodyStyles: {
            fontSize: 10,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { top: 50 },
    });

    // Footer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalDoc = doc as any;
    const pageCount = internalDoc.internal.getNumberOfPages() as number;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    doc.save(`${filename}_${format(now, 'yyyyMMdd_HHmm')}.pdf`);
};
