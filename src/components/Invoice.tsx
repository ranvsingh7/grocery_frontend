import { Printer } from "lucide-react";
import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export interface StoreInfo {
  name: string;
  gstin: string;
  address: string;
  contact: string;
}

export interface InvoiceOrderItem {
  productName: string;
  quantity: number;
  price: number;
  productImage?: string;
}

export interface InvoiceOrder {
  orderId: string;
  createdAt: string;
  items: InvoiceOrderItem[];
  totalAmount: number;
  deliveryCharge?: number;
  handlingCharge?: number;
  paymentMode: string;
  status: string;
}

export interface InvoiceUser {
  name: string;
  address: string;
  mobile: string;
}

interface InvoiceProps {
  store: StoreInfo;
  user: InvoiceUser;
  order: InvoiceOrder;
    buttonText?: string;
  onDownload?: () => void;
}

const Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ store, user, order }, ref) => {
  return (
    <div ref={ref} style={{ background: '#fff', color: '#222', padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 className="font-bold" style={{ textAlign: 'center', marginBottom: 8 }}>{store.name}</h1>
      <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 4 }}>{store.address}</div>
      <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 4 }}>GSTIN: {store.gstin} | Contact: {store.contact}</div>
      <hr style={{ margin: '16px 0' }} />
      <div style={{ marginBottom: 8 }}>
        <strong>Order ID:</strong> {order.orderId}<br />
        <strong>Date:</strong> {new Date(order.createdAt).toLocaleString('en-IN')}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Customer:</strong> {user.name}<br />
        <strong>Address:</strong> {user.address}<br />
        <strong>Mobile:</strong> {user.mobile}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f6f7fa' }}>
            <th style={{ border: '1px solid #ddd', padding: 6, fontWeight: 600 }}>Item</th>
            <th style={{ border: '1px solid #ddd', padding: 6, fontWeight: 600 }}>Qty</th>
            <th style={{ border: '1px solid #ddd', padding: 6, fontWeight: 600 }}>Price</th>
            <th style={{ border: '1px solid #ddd', padding: 6, fontWeight: 600 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 6 }}>{item.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>₹{item.price}</td>
              <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>₹{item.price * item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'right', marginBottom: 4 }}>
        <div>Subtotal: ₹{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)}</div>
        {order.handlingCharge !== undefined && order.handlingCharge > 0 && (
          <div className="text-sm font-semibold">Handling Charge: ₹{order.handlingCharge}</div>
        )}
        {order.deliveryCharge !== undefined &&  (
          <div className="text-sm font-semibold">Delivery Charge: ₹{order.deliveryCharge}</div>
        )}
        <hr className="my-4"/>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Total: ₹{order.totalAmount}</div>
        <hr className="my-4"/>
      </div>
      <div style={{ marginTop: 16, fontSize: 13 }}>
        <strong>Payment Mode:</strong> {order.paymentMode} <br />

      </div>
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#888' }}>
        Thank you for shopping with us!
      </div>
    </div>
  );
});

Invoice.displayName = 'Invoice';

export const InvoiceDownloadButton: React.FC<InvoiceProps> = ({buttonText, ...props}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Invoice_${props.order.orderId}`,
  });
  return (
    <>
      <button
        onClick={handlePrint}
        style={{
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '8px 16px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <Printer style={{ marginRight: 6, verticalAlign: 'middle' }} />
        <span style={{ verticalAlign: 'middle' }}>{buttonText ? buttonText : "Download/Print Invoice"}</span>
      </button>
      <div style={{ display: 'none' }}>
        <Invoice ref={componentRef} {...props} />
      </div>
    </>
  );
};

export default Invoice;
