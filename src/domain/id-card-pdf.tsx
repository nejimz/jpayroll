import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

/** CR80 credit-card size */
const CARD_W = "85.6mm";
const CARD_H = "54mm";
const CARDS_PER_PAGE = 8; // 2×4 on A4

export type IdCardProps = {
  employeeNo: string;
  employeeName: string;
  department: string;
  badgeCode: string;
  barcodeDataUrl: string;
  qrDataUrl: string;
  photoDataUrl?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: "12mm",
    paddingBottom: "12mm",
    paddingHorizontal: "12mm",
    fontFamily: "Helvetica",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "flex-start",
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderWidth: 0.75,
    borderColor: "#1a1a1a",
    borderStyle: "solid",
    marginBottom: "6mm",
    padding: "3mm",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  photo: {
    width: "16mm",
    height: "20mm",
    objectFit: "cover",
    marginRight: 4,
    borderWidth: 0.5,
    borderColor: "#ccc",
  },
  headerText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  company: {
    fontSize: 7,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  name: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  meta: {
    fontSize: 8,
    color: "#333",
    marginBottom: 1,
  },
  muted: {
    fontSize: 7,
    color: "#666",
  },
  body: {
    flexDirection: "row",
    flexGrow: 1,
    marginTop: 3,
    alignItems: "flex-end",
  },
  left: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 4,
    justifyContent: "flex-end",
  },
  barcode: {
    width: "48mm",
    height: "11mm",
    objectFit: "contain",
  },
  badgeLabel: {
    fontSize: 6,
    color: "#555",
    marginTop: 2,
    fontFamily: "Courier",
  },
  qr: {
    width: "16mm",
    height: "16mm",
    objectFit: "contain",
  },
});

function IdCardFace(props: IdCardProps & { companyName: string }) {
  const identity = React.createElement(
    View,
    { style: props.photoDataUrl ? styles.headerText : undefined },
    React.createElement(Text, { style: styles.company }, props.companyName),
    React.createElement(Text, { style: styles.name }, props.employeeName),
    React.createElement(Text, { style: styles.meta }, `No. ${props.employeeNo}`),
    React.createElement(Text, { style: styles.muted }, props.department || "—")
  );

  return React.createElement(
    View,
    { style: styles.card, wrap: false },
    props.photoDataUrl
      ? React.createElement(
          View,
          { style: styles.header },
          React.createElement(Image, { src: props.photoDataUrl, style: styles.photo }),
          identity
        )
      : identity,
    React.createElement(
      View,
      { style: styles.body },
      React.createElement(
        View,
        { style: styles.left },
        React.createElement(Image, { src: props.barcodeDataUrl, style: styles.barcode }),
        React.createElement(Text, { style: styles.badgeLabel }, props.badgeCode)
      ),
      React.createElement(Image, { src: props.qrDataUrl, style: styles.qr })
    )
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function IdCardDocument(props: {
  companyName: string;
  cards: IdCardProps[];
}) {
  const pages = chunk(props.cards, CARDS_PER_PAGE);

  return React.createElement(
    Document,
    null,
    ...pages.map((pageCards, pageIndex) =>
      React.createElement(
        Page,
        { key: pageIndex, size: "A4", style: styles.page },
        ...pageCards.map((card) =>
          React.createElement(IdCardFace, {
            key: card.badgeCode + card.employeeNo,
            companyName: props.companyName,
            ...card,
          })
        )
      )
    )
  );
}
