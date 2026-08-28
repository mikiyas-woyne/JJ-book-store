export type UserRole = 'customer' | 'staff' | 'employee' | 'admin' | 'superAdmin';
export type UserStatus = 'active' | 'suspended';

export type EmployeeRole =
  | 'order_processor'
  | 'delivery_coordinator'
  | 'inventory_staff'
  | 'customer_service'
  | 'delivery_personnel';

export type EmployeePermission =
  | 'view_orders'
  | 'confirm_orders'
  | 'process_orders'
  | 'pack_orders'
  | 'assign_deliveries'
  | 'view_delivery_addresses'
  | 'update_delivery_status'
  | 'manage_inventory'
  | 'inventory.view'
  | 'inventory.restock'
  | 'inventory.adjust'
  | 'inventory.approve'
  | 'customer_service'
  | 'view_customers'
  | 'manage_reviews';

export interface Employee {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  assignedRoles: EmployeeRole[];
  permissions: EmployeePermission[];
  active: boolean;
  zone?: string;
  ordersProcessedCount: number;
  deliveriesCompletedCount: number;
  failedDeliveriesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  assignedRoles?: EmployeeRole[];
  permissions?: EmployeePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  description: string;
  authorId: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  price: number; // in ETB
  discountPrice?: number; // in ETB
  currency: string; // 'ETB'
  coverImage: string;
  ISBN: string;
  publisher: string;
  publicationDate: string;
  pages: number;
  language: string; // 'Amharic' | 'English' | 'Oromiffa'
  stock: number;
  reservedStock?: number;
  soldCount: number;
  ratingAverage: number;
  reviewCount: number;
  featured: boolean;
  newArrival: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  image: string;
  bio: string;
  active: boolean;
  bookCount?: number;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
  bookCount?: number;
  createdAt?: string;
}

export interface CartItem {
  bookId: string;
  book: Book;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export type EthiopianRegion =
  | 'Addis Ababa'
  | 'Oromia'
  | 'Amhara'
  | 'Sidama'
  | 'SNNPR'
  | 'Dire Dawa'
  | 'Harari'
  | 'Tigray'
  | 'Somali'
  | 'Afar'
  | 'Benishangul-Gumuz'
  | 'Gambela';

export interface EthiopianAddress {
  id?: string;
  fullName: string;
  phone: string;
  region: EthiopianRegion;
  city: string;
  subcity?: string; // For Addis Ababa: Bole, Kirkos, Yeka, Arada, Nifas Silk, Kolfe, Akaky, Gullele, Lideta, Lemi Kura
  houseNumber?: string;
  streetAddress: string;
  deliveryNotes?: string;
  isDefault?: boolean;
}

export type PaymentMethod = 'cod' | 'telebirr' | 'cbe_birr' | 'chapa' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'ready_for_delivery'
  | 'assigned'
  | 'handed_to_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'rescheduled'
  | 'returned_to_store'
  | 'cancelled';

export interface OrderItem {
  bookId: string;
  title: string;
  coverImage: string;
  authorName: string;
  price: number;
  quantity: number;
  total: number;
  collected?: boolean;
  missing?: boolean;
  shelfLocation?: string;
}

export interface PackageInfo {
  id?: string;
  orderId: string;
  packageNumber: string;
  itemCount: number;
  weightKg?: number;
  packageType: 'box' | 'bubble_mailer' | 'bag' | 'envelope';
  packedByEmployeeId: string;
  packedByEmployeeName: string;
  packedAt: string;
}

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  orderNumber: string;
  deliveryEmployeeId: string;
  deliveryEmployeeName: string;
  deliveryEmployeePhone?: string;
  customerName: string;
  customerPhone: string;
  address: EthiopianAddress;
  packageCount: number;
  codAmountToCollect: number;
  assignedAt: string;
  assignedBy: string;
  expectedDeliveryDate?: string;
  status: 'assigned' | 'handed_over' | 'in_transit' | 'delivered' | 'failed' | 'returned';
}

export interface DeliveryHandoffRecord {
  id: string;
  orderId: string;
  packageNumber: string;
  packageCount: number;
  givenByStoreEmployeeId: string;
  givenByStoreEmployeeName: string;
  receivedByDeliveryEmployeeId: string;
  receivedByDeliveryEmployeeName: string;
  timestamp: string;
  acknowledged: boolean;
  notes?: string;
}

export interface DeliveryEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  reason?: string;
  notes?: string;
  amountCollected?: number;
  paymentMethod?: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
}

export interface ReturnToStoreRecord {
  id: string;
  orderId: string;
  packageNumber?: string;
  reason: string;
  returnedByEmployeeId: string;
  returnedByEmployeeName: string;
  receivedByStoreEmployeeId: string;
  receivedByStoreEmployeeName: string;
  timestamp: string;
  packageCondition: 'good' | 'damaged' | 'opened';
}

export interface EmployeeActivityLog {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  action: string;
  orderId?: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface CustomerCommunication {
  id: string;
  orderId: string;
  customerId: string;
  employeeId: string;
  employeeName: string;
  note: string;
  channel: 'phone' | 'email' | 'in_person' | 'app';
  timestamp: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  verifiedReceiptNumber?: string;
  verifiedByEmployeeId?: string;
  verifiedByEmployeeName?: string;
  verifiedAt?: string;
  isReceiptVerified?: boolean;
  orderStatus: OrderStatus;
  shippingAddress: EthiopianAddress;
  notes?: string;
  deliveryNotes?: string;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
  packages?: PackageInfo[];
  assignedDeliveryDriverId?: string;
  assignedDeliveryDriverName?: string;
  assignedDeliveryDriverPhone?: string;
  deliveryFailedReason?: string;
  returnToStoreReason?: string;
  preparationNotes?: string;
  lastActionByEmployeeId?: string;
  lastActionByEmployeeName?: string;
  statusHistory?: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
    employeeId?: string;
    employeeName?: string;
  }[];
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1 to 5
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expirationDate: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

export type InventoryTransactionType =
  | 'SALE'
  | 'RESERVATION'
  | 'RELEASE'
  | 'RESTOCK'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'REFUND'
  | 'restock'
  | 'order_placed'
  | 'order_cancelled'
  | 'manual_adjustment';

export interface InventoryTransaction {
  id: string;
  transactionId?: string;
  bookId: string;
  bookTitle: string;
  orderId?: string;
  type?: InventoryTransactionType;
  quantity?: number;
  changeQuantity: number;
  previousStock: number;
  newStock: number;
  previousSoldCount?: number;
  newSoldCount?: number;
  reason: string;
  performedBy: string;
  performedByName?: string;
  createdAt: string;
}

export interface StoreNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'account' | 'promo';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface EmailNotificationLog {
  id: string;
  orderId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  emailType: 'approved' | 'rejected' | 'status_update';
  status: 'sent' | 'delivered' | 'failed';
  verifiedByEmployeeName?: string;
  receiptNumber?: string;
  note?: string;
  sentAt: string;
  htmlBody: string;
}

export interface StoreSettings {
  storeName: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  shippingFee: number;
  minFreeShipping: number;
  taxRate: number; // percentage e.g. 15 for 15% VAT
  storeStatus: 'open' | 'maintenance';
  socialLinks: {
    facebook?: string;
    telegram?: string;
    instagram?: string;
  };
  paymentGateways: {
    codEnabled: boolean;
    telebirrEnabled: boolean;
    telebirrNumber?: string;
    cbeBirrEnabled: boolean;
    cbeAccountNumber?: string;
    chapaEnabled: boolean;
    bankTransferEnabled: boolean;
    bankDetails?: string;
  };
}
