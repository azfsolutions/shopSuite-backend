import { Injectable, Logger } from '@nestjs/common';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import * as React from 'react';

interface QuotePdfData {
    storeName: string;
    storeEmail?: string | null;
    customerName: string;
    customerEmail: string;
    quoteNumber: string;
    issuedAt: Date;
    validUntil: Date;
    items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
    subtotal: number;
    total: number;
    paymentTerms?: string | null;
    deliveryTerms?: string | null;
    notes?: string | null;
}

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    storeBlock: { fontSize: 16, fontWeight: 'bold' },
    quoteBlock: { textAlign: 'right' },
    quoteNumber: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    section: { marginTop: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4, color: '#0047d4' },
    table: { marginTop: 12, borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc' },
    tableRow: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: 6 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', paddingVertical: 6, fontWeight: 'bold' },
    cellName: { flex: 4, paddingHorizontal: 4 },
    cellQty: { flex: 1, paddingHorizontal: 4, textAlign: 'right' },
    cellPrice: { flex: 2, paddingHorizontal: 4, textAlign: 'right' },
    cellSubtotal: { flex: 2, paddingHorizontal: 4, textAlign: 'right' },
    totals: { marginTop: 16, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    totalLabel: { width: 100, textAlign: 'right', paddingRight: 8 },
    totalValue: { width: 100, textAlign: 'right', fontWeight: 'bold' },
    footer: { marginTop: 24, paddingTop: 12, borderTop: '1px solid #ccc', fontSize: 9, color: '#555' },
});

@Injectable()
export class B2BQuotePdfService {
    private readonly logger = new Logger(B2BQuotePdfService.name);

    async render(data: QuotePdfData): Promise<Buffer> {
        const formatMoney = (n: number) => `$${n.toFixed(2)}`;
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const doc = React.createElement(
            Document,
            null,
            React.createElement(
                Page,
                { size: 'A4', style: styles.page },
                React.createElement(
                    View,
                    { style: styles.header },
                    React.createElement(
                        View,
                        null,
                        React.createElement(Text, { style: styles.storeBlock }, data.storeName),
                        data.storeEmail ? React.createElement(Text, null, data.storeEmail) : null,
                    ),
                    React.createElement(
                        View,
                        { style: styles.quoteBlock },
                        React.createElement(Text, { style: styles.quoteNumber }, `COTIZACIÓN ${data.quoteNumber}`),
                        React.createElement(Text, null, `Emitida: ${formatDate(data.issuedAt)}`),
                        React.createElement(Text, null, `Válida hasta: ${formatDate(data.validUntil)}`),
                    ),
                ),
                React.createElement(
                    View,
                    { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, 'CLIENTE'),
                    React.createElement(Text, null, data.customerName),
                    React.createElement(Text, null, data.customerEmail),
                ),
                React.createElement(
                    View,
                    { style: styles.table },
                    React.createElement(
                        View,
                        { style: styles.tableHeader },
                        React.createElement(Text, { style: styles.cellName }, 'Producto'),
                        React.createElement(Text, { style: styles.cellQty }, 'Cant.'),
                        React.createElement(Text, { style: styles.cellPrice }, 'P. Unit.'),
                        React.createElement(Text, { style: styles.cellSubtotal }, 'Subtotal'),
                    ),
                    ...data.items.map((item, idx) =>
                        React.createElement(
                            View,
                            { key: idx, style: styles.tableRow },
                            React.createElement(Text, { style: styles.cellName }, item.name),
                            React.createElement(Text, { style: styles.cellQty }, String(item.quantity)),
                            React.createElement(Text, { style: styles.cellPrice }, formatMoney(item.unitPrice)),
                            React.createElement(Text, { style: styles.cellSubtotal }, formatMoney(item.subtotal)),
                        ),
                    ),
                ),
                React.createElement(
                    View,
                    { style: styles.totals },
                    React.createElement(
                        View,
                        { style: styles.totalRow },
                        React.createElement(Text, { style: styles.totalLabel }, 'Subtotal:'),
                        React.createElement(Text, { style: styles.totalValue }, formatMoney(data.subtotal)),
                    ),
                    React.createElement(
                        View,
                        { style: styles.totalRow },
                        React.createElement(Text, { style: styles.totalLabel }, 'TOTAL:'),
                        React.createElement(Text, { style: styles.totalValue }, formatMoney(data.total)),
                    ),
                ),
                (data.paymentTerms || data.deliveryTerms || data.notes) &&
                    React.createElement(
                        View,
                        { style: styles.footer },
                        data.paymentTerms ? React.createElement(Text, null, `Pago: ${data.paymentTerms}`) : null,
                        data.deliveryTerms ? React.createElement(Text, null, `Entrega: ${data.deliveryTerms}`) : null,
                        data.notes ? React.createElement(Text, null, data.notes) : null,
                    ),
            ),
        );

        const buffer = await renderToBuffer(doc as any);
        return buffer;
    }
}
