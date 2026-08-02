import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatPhp } from "@/lib/money";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  muted: { color: "#555" },
  bold: { fontWeight: "bold", marginTop: 8 },
});

export function PayslipDocument(props: {
  companyName: string;
  tin: string | null;
  employeeName: string;
  employeeNo: string;
  periodStart: string;
  periodEnd: string;
  regular: number;
  ot: number;
  holiday: number;
  nd: number;
  gross: number;
  sssEe: number;
  phEe: number;
  pagEe: number;
  tax: number;
  net: number;
}) {
  const row = (label: string, value: number) =>
    React.createElement(
      View,
      { style: styles.row, key: label },
      React.createElement(Text, { style: styles.muted }, label),
      React.createElement(Text, null, formatPhp(value))
    );

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, props.companyName),
      React.createElement(Text, { style: styles.muted }, `TIN: ${props.tin ?? "—"}`),
      React.createElement(
        Text,
        { style: { marginTop: 8, marginBottom: 12 } },
        `Payslip ${props.periodStart} to ${props.periodEnd}`
      ),
      React.createElement(Text, { style: styles.bold }, `${props.employeeNo} — ${props.employeeName}`),
      row("Regular pay", props.regular),
      row("Overtime", props.ot),
      row("Holiday premium", props.holiday),
      row("Night differential", props.nd),
      row("Gross", props.gross),
      row("SSS (Employee)", props.sssEe),
      row("PhilHealth (Employee)", props.phEe),
      row("Pag-IBIG (Employee)", props.pagEe),
      row("Withholding tax", props.tax),
      React.createElement(
        View,
        { style: [styles.row, { marginTop: 10 }] },
        React.createElement(Text, { style: styles.bold }, "Net pay"),
        React.createElement(Text, { style: styles.bold }, formatPhp(props.net))
      ),
      React.createElement(
        Text,
        { style: { marginTop: 16, fontSize: 9, color: "#777" } },
        "Illustrative statutory tables — verify before production use."
      )
    )
  );
}
