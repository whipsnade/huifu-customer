import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Card, Button, StatusBadge, UrgencyBadge } from './components/UI';
import { MapPin, Bell, AlertTriangle, Camera, PenTool, CheckCircle, ChevronRight, X, Loader2, Search, Navigation, Calculator, Fan, Lightbulb, Droplets, HelpCircle, ImagePlus, Trash2, Info, Filter, Calendar, ChevronDown, MonitorSmartphone, Headphones, ChevronLeft, Phone, User, Users, Clock, Map as MapIcon, CreditCard, Wallet, Edit3, Mic, Square, Sparkles, Mail, MailOpen, FileText, Settings as SettingsIcon, ChevronUp, Bot, Send, Barcode, Tag, CalendarClock, Star, Play, RotateCcw, Eraser, LogOut, Key, Shield, ShieldCheck, Coins, Building, Building2, Link as LinkIcon, Eye, EyeOff, Video, StopCircle, Fingerprint, ArrowUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowLeft, Wrench, AlertCircle, Receipt, Download, CheckCircle2, Ticket, MessageSquareWarning, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';
import { WorkOrder, OrderStatus, UrgencyLevel, AnalysisResult } from './types';
import { analyzeRepairImage, analyzeRepairAudio } from './services/geminiService';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'sonner';

// --- HELPERS ---
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
const subMinutes = (date: Date, minutes: number) => new Date(date.getTime() - minutes * 60000);

// --- MOCK DATA ---
const NOW = new Date();

const MOCK_ENGINEER = {
  id: 'ENG-001',
  name: '王师傅',
  phone: '138-0000-0000',
  rating: 4.8,
  latitude: 40.7128,
  longitude: -74.0060,
  distance: '1.2km',
  avatarUrl: 'https://i.pravatar.cc/150?u=eng1'
};

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: '工程师已指派',
    message: '王师傅 已接单（工单号 WO-9920）。他将在约30分钟后到达。',
    type: 'order',
    isRead: false,
    timestamp: subMinutes(NOW, 30).toISOString()
  },
  {
    id: '2',
    title: '系统维护通知',
    message: '计划于今晚凌晨2点至4点进行服务器维护，服务可能会间歇性中断。',
    type: 'system',
    isRead: false,
    timestamp: subDays(NOW, 0.5).toISOString()
  },
   {
    id: '3',
    title: '支付成功',
    message: '工单 WO-9850 的付款已成功处理。',
    type: 'payment',
    isRead: true,
    timestamp: subDays(NOW, 2).toISOString()
  },
  {
    id: '4',
    title: '工单已完成',
    message: '工程师已标记工单 WO-9801（卫生间漏水）为已完成。',
    type: 'order',
    isRead: true,
    timestamp: subDays(NOW, 45).toISOString()
  }
];

const MOCK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-9925',
    title: 'POS机连接失败',
    location: '吧台区域 • 1楼',
    status: OrderStatus.PENDING,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subMinutes(NOW, 10).toISOString(),
    equipmentId: 'pos',
    timeline: [{ title: '工单已创建', timestamp: subMinutes(NOW, 10).toISOString(), isActive: true }],
    description: "屏幕冻结，触摸无反应。",
    remarks: "请从侧门进入。",
    serialNumber: "POS-2023-X99",
    cost: 100,
    scheduledTime: "尽快上门"
  },
  {
    id: 'WO-9920',
    title: '制冰机故障',
    location: '主厨房 • B1层',
    status: OrderStatus.PENDING_VISIT,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subDays(NOW, 0.1).toISOString(),
    equipmentId: 'other',
    timeline: [
      { title: '工单已创建', timestamp: subDays(NOW, 0.1).toISOString(), isActive: false },
      { title: '工程师已指派', timestamp: subMinutes(NOW, 30).toISOString(), isActive: true }
    ],
    engineer: MOCK_ENGINEER,
    description: "发出巨大的研磨声，且不制冰。",
    remarks: "门禁密码是 1234",
    cost: 150,
    scheduledTime: "2023-10-25 14:00"
  },
  {
    id: 'WO-9918',
    title: '空调系统维护',
    location: '屋顶机组 3号',
    status: OrderStatus.PENDING_REVIEW,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 3).toISOString(),
    equipmentId: 'hvac',
    timeline: [
      { title: '工单已创建', timestamp: subDays(NOW, 3).toISOString(), isActive: false },
      { title: '工程师已到达', timestamp: subDays(NOW, 3).toISOString(), isActive: false },
      { title: '诊断完成', timestamp: subDays(NOW, 3).toISOString(), isActive: true }
    ],
    engineer: MOCK_ENGINEER,
    description: "定期维护检查。",
    cost: 200
  },
  {
    id: 'WO-9750',
    title: '电梯照明更换',
    location: '东侧电梯',
    status: OrderStatus.CLOSED,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 60).toISOString(),
    equipmentId: 'light',
    timeline: [],
    engineer: MOCK_ENGINEER,
    cost: 80.00,
    userRating: 5,
    userReview: "王师傅来得很快，服务态度非常好！"
  },
  {
    id: 'WO-9700',
    title: '会议室空调漏水',
    location: '3楼会议室',
    status: OrderStatus.CANCELLED,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 70).toISOString(),
    equipmentId: 'hvac',
    timeline: [{ title: '工单已取消', timestamp: subMinutes(NOW, 30).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 0
  },
  {
    id: 'WO-9400',
    title: '网络路由器重启',
    location: '办公室',
    status: OrderStatus.ACCEPTED,
    urgency: UrgencyLevel.LOW,
    dateCreated: subMinutes(NOW, 60).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '已接单', timestamp: subMinutes(NOW, 10).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 50.00
  },
  {
    id: 'WO-9300',
    title: '门禁系统检修',
    location: '侧门',
    status: OrderStatus.PROCESSING,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 1).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '处理中', timestamp: subMinutes(NOW, 30).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 120.00
  },
  {
    id: 'WO-9200',
    title: '监控摄像头调整',
    location: '停车场',
    status: OrderStatus.DEPARTED,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 0.5).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '已出发', timestamp: subMinutes(NOW, 15).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 80.00
  },
  {
    id: 'WO-9100',
    title: '烟雾报警器测试',
    location: '走廊',
    status: OrderStatus.ARRIVED,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 2).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '已到达', timestamp: subMinutes(NOW, 5).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 60.00
  },
  {
    id: 'WO-9000',
    title: '排风扇噪音修复',
    location: '厨房',
    status: OrderStatus.IN_PROGRESS,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 1).toISOString(),
    equipmentId: 'hvac',
    timeline: [{ title: '到店维修中', timestamp: subMinutes(NOW, 45).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 180.00
  },
  {
    id: 'WO-8900',
    title: '冷库门密封条更换',
    location: '仓库',
    status: OrderStatus.RESTARTED,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subDays(NOW, 3).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '工单已重启', timestamp: subMinutes(NOW, 20).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 220.00
  },
  {
    id: 'WO-8800',
    title: '备用发电机检查',
    location: '地下室',
    status: OrderStatus.REFUNDING,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 10).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '退款中', timestamp: subDays(NOW, 1).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 500.00
  },
  {
    id: 'WO-8700',
    title: '自动门感应器维修',
    location: '正门',
    status: OrderStatus.PENDING_ACCEPTANCE,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 4).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '待验收', timestamp: subDays(NOW, 0.5).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 260.00,
    costBreakdown: {
      callOutFee: 50.00,
      laborFee: 100.00,
      partsFee: 110.00
    },
    repairReport: {
      solutionMethod: '更换感应器主板',
      solutionDescription: '经检查发现感应器主板受潮短路，已更换为原厂全新主板，并对密封性进行了加固处理。目前感应灵敏，运行正常。',
      mediaUrls: [
        'https://picsum.photos/seed/repair1/400/300',
        'https://picsum.photos/seed/repair2/400/300',
        'https://picsum.photos/seed/repair3/400/300'
      ]
    }
  },
  {
    id: 'WO-8550',
    title: '中央空调滤网清洗',
    location: '办公区 A',
    status: OrderStatus.PENDING_ACCEPTANCE,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 2).toISOString(),
    equipmentId: 'hvac',
    timeline: [{ title: '待验收', timestamp: subMinutes(NOW, 120).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 150.00,
    costBreakdown: {
      callOutFee: 50.00,
      laborFee: 100.00,
      partsFee: 0.00
    },
    repairReport: {
      solutionMethod: '深度清洗滤网',
      solutionDescription: '已对空调内机滤网进行深度清洗与消毒，并检查了排水管路，目前出风清新，制冷效果良好。',
      mediaUrls: [
        'https://picsum.photos/seed/ac1/400/300',
        'https://picsum.photos/seed/ac2/400/300'
      ]
    }
  },
  {
    id: 'WO-8600',
    title: '饮水机滤芯更换',
    location: '茶水间',
    status: OrderStatus.CANCELLED,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 7).toISOString(),
    equipmentId: 'other',
    timeline: [{ title: '工单已取消', timestamp: subDays(NOW, 2).toISOString(), isActive: true }],
    engineer: MOCK_ENGINEER,
    cost: 110.00
  }
];

const EQUIPMENT_TYPES = [
  { 
    id: 'pos', 
    name: 'POS终端', 
    icon: Calculator, 
    basePrice: 50,
    issues: [
      { name: '无法开机', price: 100 },
      { name: '网络离线', price: 60 },
      { name: '打印机卡纸', price: 50 },
      { name: '触摸屏失灵', price: 120 }
    ]
  },
  { 
    id: 'hvac', 
    name: '空调暖通', 
    icon: Fan, 
    basePrice: 80,
    issues: [
      { name: '不制冷/热', price: 200 },
      { name: '漏水', price: 150 },
      { name: '噪音大', price: 100 },
      { name: '异味', price: 120 }
    ]
  },
  { 
    id: 'light', 
    name: '照明灯具', 
    icon: Lightbulb, 
    basePrice: 30,
    issues: [
      { name: '灯泡烧坏', price: 40 },
      { name: '闪烁', price: 50 },
      { name: '开关损坏', price: 60 },
      { name: '灯具松动', price: 50 }
    ] 
  },
  { 
    id: 'plumbing', 
    name: '管道水路', 
    icon: Droplets, 
    basePrice: 60,
    issues: [
      { name: '水龙头漏水', price: 80 },
      { name: '下水道堵塞', price: 120 },
      { name: '无热水', price: 100 },
      { name: '水压低', price: 80 }
    ] 
  },
  { 
    id: 'other', 
    name: '其他杂项', 
    icon: HelpCircle, 
    basePrice: 50,
    issues: [
      { name: '一般损坏', price: 50 },
      { name: '需要清洁', price: 100 },
      { name: '安全隐患', price: 80 },
      { name: '家具破损', price: 60 }
    ] 
  }
];

const STATUS_FILTERS = ['全部', '进行中', '待验收', '待评价', '退款中', '待付款', '已完成'];
const RESTART_REASONS = ["维修不彻底", "验收未通过", "新增关联故障", "误操作关闭", "配件/资源缺失", "其他"];
const DATE_RANGES = [
  { label: '近10天', value: '10d', days: 10 },
  { label: '近1个月', value: '1m', days: 30 },
  { label: '近3个月', value: '3m', days: 90 },
  { label: '近半年', value: '6m', days: 180 },
  { label: '近1年', value: '1y', days: 365 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState<WorkOrder[]>(MOCK_ORDERS);
  
  // --- DRAG TO SCROLL FOR TABS ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    if (Math.abs(x - startX) > 5) setHasMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scannedEqId, setScannedEqId] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const hasUnreadNotifications = useMemo(() => notifications.some(n => !n.isRead), [notifications]);
  const [currentLocation, setCurrentLocation] = useState('上海中心大厦, 上海');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState('https://picsum.photos/100/100');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Detail View States
  const [isEditRemarksOpen, setIsEditRemarksOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSubmitPaymentOpen, setIsSubmitPaymentOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<WorkOrder | null>(null);
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false);
  const [isAfterSalesOpen, setIsAfterSalesOpen] = useState(false);
  const [isReopenTicketOpen, setIsReopenTicketOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalMessage, setCancelModalMessage] = useState('');
  const [editRemarksValue, setEditRemarksValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [isHurryUpOpen, setIsHurryUpOpen] = useState(false);
  const [hurryUpContent, setHurryUpContent] = useState("");
  const [hurryUpTargetOrder, setHurryUpTargetOrder] = useState<WorkOrder | null>(null);
  const [chartRange, setChartRange] = useState<'month' | 'quarter' | 'half-year'>('half-year');
  
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginMode, setLoginMode] = useState<'password' | 'sms' | 'register' | 'forgot'>('password');
  const [userName, setUserName] = useState('张三');
  const [userPhone, setUserPhone] = useState('138-1234-5678');
  const [userAddress, setUserAddress] = useState('上海市浦东新区世纪大道1号');
  const [userType, setUserType] = useState<'individual' | 'corporate'>('individual');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAccountSecurityOpen, setIsAccountSecurityOpen] = useState(false);
  const [isChangePhoneOpen, setIsChangePhoneOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isOtherAccountsOpen, setIsOtherAccountsOpen] = useState(false);
  const [associatedAccounts, setAssociatedAccounts] = useState([
    { id: '1', name: '关联账号 A', phone: '139****1234' },
    { id: '2', name: '关联账号 B', phone: '137****5678' },
  ]);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isForgotPhoneVerified, setIsForgotPhoneVerified] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [isForgotErrorModalOpen, setIsForgotErrorModalOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [userPoints, setUserPoints] = useState(541.34);
  const [isPointsManagementOpen, setIsPointsManagementOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<string>('50');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // Bank Card States
  const [hasBankCard, setHasBankCard] = useState(false);
  const [isAddBankCardOpen, setIsAddBankCardOpen] = useState(false);
  const [isFaceRecognitionOpen, setIsFaceRecognitionOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  
  // Enterprise Certification States
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [enterpriseFlow, setEnterpriseFlow] = useState<'link' | 'create' | null>(null);
  const [linkForm, setLinkForm] = useState({ code: '', storeId: '', contact: '' });
  const [createForm, setCreateForm] = useState({ name: '', contactName: '', phone: '', address: '', taxId: '', bankName: '', bankAccount: '', businessLicense: '' });
  
  // Registration Form States
  const [regStoreName, setRegStoreName] = useState('');
  const [regStoreAddress, setRegStoreAddress] = useState('');
  const [regContactName, setRegContactName] = useState('');
  const [regContactPhone, setRegContactPhone] = useState('');
  const [regSmsCode, setRegSmsCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  // Orders Filter State
  const [filterStatus, setFilterStatus] = useState('全部');
  const [costFilter, setCostFilter] = useState('全部');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('3m'); // Default 3 months
  const [sortField, setSortField] = useState('dateCreated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Smart Repair State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{id: string, text?: string, sender: 'user' | 'agent', order?: WorkOrder}[]>([
      { id: '1', text: "您好！我是您的智能客服助手。您可以在下方选择工单进行反馈，或直接向我提问。", sender: 'agent' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'support') {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Auto-complete orders that are in PENDING_REVIEW for more than 7 days, and archive CLOSED orders after 48 hours
  useEffect(() => {
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
    const now = new Date().getTime();
    
    setOrders(prevOrders => {
      let changed = false;
      const updatedOrders = prevOrders.map(order => {
        if (order.status === OrderStatus.PENDING_REVIEW) {
          // Find the time it entered PENDING_REVIEW (last timeline event before this check)
          const lastEvent = order.timeline[order.timeline.length - 1];
          const lastEventTime = lastEvent ? new Date(lastEvent.timestamp).getTime() : new Date(order.dateCreated).getTime();
          
          if (now - lastEventTime > sevenDaysInMs) {
            changed = true;
            return {
              ...order,
              status: OrderStatus.CLOSED,
              userRating: 5,
              userReview: "系统默认好评",
              timeline: [
                ...order.timeline,
                { title: '系统自动完成并好评', timestamp: new Date().toISOString(), isActive: true }
              ]
            };
          }
        } else if (order.status === OrderStatus.CLOSED) {
          const lastEvent = order.timeline[order.timeline.length - 1];
          const lastEventTime = lastEvent ? new Date(lastEvent.timestamp).getTime() : new Date(order.dateCreated).getTime();
          
          if (now - lastEventTime > fortyEightHoursInMs) {
            changed = true;
            return {
              ...order,
              status: OrderStatus.ARCHIVED,
              timeline: [
                ...order.timeline,
                { title: '工单已归档', timestamp: new Date(lastEventTime + fortyEightHoursInMs + 1000).toISOString(), isActive: true }
              ]
            };
          }
        }
        return order;
      });
      return changed ? updatedOrders : prevOrders;
    });
  }, []);

  // Stats
  const stats = {
    progress: orders.filter(o => [
      OrderStatus.PENDING, 
      OrderStatus.ACCEPTED, 
      OrderStatus.PENDING_VISIT, 
      OrderStatus.PROCESSING, 
      OrderStatus.DEPARTED, 
      OrderStatus.ARRIVED, 
      OrderStatus.IN_PROGRESS, 
      OrderStatus.RESTARTED, 
      OrderStatus.REFUNDING
    ].includes(o.status)).length,
    pending: orders.filter(o => [
      OrderStatus.PENDING_ACCEPTANCE, 
      OrderStatus.PENDING_PAYMENT, 
      OrderStatus.PENDING_REVIEW
    ].includes(o.status)).length,
    completed: orders.filter(o => [
      OrderStatus.CLOSED, 
      OrderStatus.CANCELLED,
      OrderStatus.ARCHIVED
    ].includes(o.status)).length
  };

  // --- FILTERS ---
  const filteredOrders = useMemo(() => {
      return orders.filter(order => {
          // 1. Status Filter
          if (filterStatus !== '全部') {
            if (filterStatus === '进行中') {
              if (![OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PENDING_VISIT, OrderStatus.PROCESSING, OrderStatus.DEPARTED, OrderStatus.ARRIVED, OrderStatus.IN_PROGRESS, OrderStatus.RESTARTED, OrderStatus.REFUNDING].includes(order.status)) return false;
            } else if (filterStatus === '已完成') {
              if (order.status !== OrderStatus.CLOSED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.ARCHIVED) return false;
            } else if (filterStatus === '待验收') {
              if (order.status !== OrderStatus.PENDING_ACCEPTANCE) return false;
            } else if (filterStatus === '待评价') {
              if (order.status !== OrderStatus.PENDING_REVIEW) return false;
            } else if (filterStatus === '退款中') {
              if (order.status !== OrderStatus.REFUNDING) return false;
            } else if (filterStatus === 'pending_group') {
              if (![OrderStatus.PENDING_ACCEPTANCE, OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_REVIEW].includes(order.status)) return false;
            } else if (filterStatus === 'completed_group') {
              if (![OrderStatus.CLOSED, OrderStatus.CANCELLED, OrderStatus.ARCHIVED].includes(order.status)) return false;
            } else if (filterStatus === 'progress_group') {
              if (![OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PENDING_VISIT, OrderStatus.PROCESSING, OrderStatus.DEPARTED, OrderStatus.ARRIVED, OrderStatus.IN_PROGRESS, OrderStatus.RESTARTED, OrderStatus.REFUNDING].includes(order.status)) return false;
            } else {
              // Exact Match
              if (order.status !== filterStatus) return false;
            }
          }
          
          // 3. Date Filter
          const daysLimit = DATE_RANGES.find(r => r.value === filterDate)?.days || 90;
          const cutoffDate = subDays(new Date(), daysLimit);
          const orderDate = new Date(order.dateCreated);
          if (orderDate < cutoffDate) return false;

          return true;
      }).sort((a, b) => {
        let cmp = 0;
        if (sortField === 'dateCreated') {
          cmp = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
        } else if (sortField === 'dateClosed') {
          // get close date from timeline, or fallback to dateCreated
          const eventA = a.timeline.find(e => ['已完成', '维修完成', '系统自动完成并好评', '评价完成', '工单已取消'].includes(e.title));
          const eventB = b.timeline.find(e => ['已完成', '维修完成', '系统自动完成并好评', '评价完成', '工单已取消'].includes(e.title));
          const timeA = eventA ? new Date(eventA.timestamp).getTime() : new Date(a.dateCreated).getTime();
          const timeB = eventB ? new Date(eventB.timestamp).getTime() : new Date(b.dateCreated).getTime();
          cmp = timeA - timeB;
        } else if (sortField === 'category') {
          const catA = EQUIPMENT_TYPES.find(e => e.id === a.equipmentId)?.name || '未知';
          const catB = EQUIPMENT_TYPES.find(e => e.id === b.equipmentId)?.name || '未知';
          cmp = catA.localeCompare(catB);
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [orders, filterStatus, filterDate, sortField, sortDirection]);

  // Calculate expenditure data for chart based on selected range
  const chartData = useMemo(() => {
    let monthCount = 3;
    if (chartRange === 'month') monthCount = 1;
    if (chartRange === 'quarter') monthCount = 3;
    if (chartRange === 'half-year') monthCount = 6;

    const months = Array.from({ length: monthCount }, (_, i) => i).reverse().map(m => {
      const date = subMonths(new Date(), m);
      return {
        month: format(date, 'MMM'),
        fullDate: date,
        amount: 0
      };
    });

    orders.forEach(order => {
      const orderDate = parseISO(order.dateCreated);
      months.forEach(m => {
        if (isWithinInterval(orderDate, { 
          start: startOfMonth(m.fullDate), 
          end: endOfMonth(m.fullDate) 
        })) {
          m.amount += (order.cost || 0);
        }
      });
    });

    return months.map(m => ({ name: m.month, amount: m.amount }));
  }, [orders, chartRange]);

  const handleStatClick = (group: 'progress' | 'pending' | 'completed') => {
    setActiveTab('orders');
    setSelectedOrder(null);
    if (group === 'progress') setFilterStatus('progress_group');
    if (group === 'pending') setFilterStatus('pending_group');
    if (group === 'completed') setFilterStatus('completed_group');
  };

  const toggleOrderExpansion = (id: string) => {
    const newSet = new Set(expandedOrderIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setExpandedOrderIds(newSet);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setIsCameraOpen(true); // Open the analysis modal
        handleAnalyze(base64); // Auto start analysis
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (image: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRepairImage(image);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateOrder = (isSmart: boolean, manualData?: any) => {
    let title = "手动报修";
    let description = "用户报告的问题";
    let urgency = UrgencyLevel.MEDIUM;
    let img = undefined;
    let eqId = manualData?.equipmentId;
    let serial = manualData?.serialNumber;
    let cost = manualData?.cost;
    let scheduledTime = manualData?.scheduledTime;

    if (isSmart && analysisResult) {
      title = analysisResult.title;
      description = analysisResult.description;
      urgency = analysisResult.urgency;
      img = selectedImage || undefined;
      // Simple heuristic for smart mapping, in real app this comes from AI
      eqId = 'other'; 
      cost = 50; // default smart cost
      scheduledTime = "尽快上门";
    } else if (manualData) {
      title = manualData.title;
      description = manualData.description;
      img = manualData.image;
      eqId = manualData.equipmentId;
    }

    const newOrder: WorkOrder = {
      id: `WO-${Math.floor(Math.random() * 10000)}`,
      title: title,
      description: description,
      location: `${currentLocation} • 大堂`, 
      status: OrderStatus.PENDING,
      urgency: urgency,
      dateCreated: new Date().toISOString(),
      equipmentId: eqId,
      imageUrl: img,
      timeline: [{ title: '工单已创建', timestamp: new Date().toLocaleTimeString(), isActive: true }],
      serialNumber: serial,
      cost: cost,
      scheduledTime: scheduledTime
    };

    setPendingOrder(newOrder);
    setIsSubmitPaymentOpen(true);
    
    setIsCameraOpen(false);
    setIsVoiceOpen(false);
    setIsManualOpen(false);
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  const handleLocationSelect = (loc: string) => {
    setCurrentLocation(loc);
    setIsLocationPickerOpen(false);
  };

  const handleOrderClick = (order: WorkOrder) => {
    setSelectedOrder(order);
    setActiveTab('orders'); // Ensure we are in the orders tab structure
  };

  const handleUpdateRemarks = () => {
    if (selectedOrder) {
      const updatedOrder = { ...selectedOrder, remarks: editRemarksValue };
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsEditRemarksOpen(false);
    }
  };

  const handleCancelOrder = () => {
    if (!selectedOrder) return;
    
    // If it's PENDING (待接单), ACCEPTED (已接单), or PROCESSING (处理中), it's free to cancel
    if (selectedOrder.status === OrderStatus.PENDING || selectedOrder.status === OrderStatus.ACCEPTED || selectedOrder.status === OrderStatus.PROCESSING) {
      setCancelModalMessage("可免费取消，付款原路返回");
      setIsCancelModalOpen(true);
      return;
    }

    // Find when it entered PENDING_VISIT status
    const visitEvent = selectedOrder.timeline.find(e => e.title === '工程师已指派' || e.title === '待上门');
    
    const startTime = visitEvent ? new Date(visitEvent.timestamp) : new Date(selectedOrder.dateCreated);
    const now = new Date();
    const diffMins = (now.getTime() - startTime.getTime()) / 60000;
    
    if (diffMins <= 15) {
      setCancelModalMessage("工单在进入待上门状态15分钟内可免费取消");
    } else {
      setCancelModalMessage("超出15分钟将扣取上门费，超出时间退费需联系客服");
    }
    setIsCancelModalOpen(true);
  };

  const confirmCancelOrder = () => {
    if (!selectedOrder) return;
    const updated = { 
      ...selectedOrder, 
      status: OrderStatus.CANCELLED,
      timeline: [
        ...selectedOrder.timeline,
        { title: '工单已取消', timestamp: new Date().toISOString(), isActive: true }
      ]
    };
    setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
    setSelectedOrder(updated);
    setIsCancelModalOpen(false);
  };

  const handlePayment = () => {
    if (!selectedOrder) return;
    // Simulate payment processing
    setTimeout(() => {
       const updated = { ...selectedOrder, status: OrderStatus.PENDING_REVIEW, timeline: [...selectedOrder.timeline, { title: '支付确认', timestamp: new Date().toISOString(), isActive: true }] };
       setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
       setSelectedOrder(updated);
       setIsPaymentOpen(false);
       toast.success("支付成功！请对工程师服务进行评价。");
    }, 1500);
  };

  const handleAcceptance = () => {
    if (!selectedOrder) return;
    setIsAcceptanceOpen(false);
    setIsSignatureOpen(true);
  };

  const handleSignatureComplete = () => {
    if (!selectedOrder) return;
    const updated: WorkOrder = { 
      ...selectedOrder, 
      status: OrderStatus.PENDING_REVIEW,
      timeline: [
        ...selectedOrder.timeline,
        { title: '工单已验收并支付', timestamp: new Date().toISOString(), isActive: true }
      ]
    };
    setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
    setSelectedOrder(updated);
    setIsSignatureOpen(false);
    setIsRatingOpen(true);
  };

  const handleSubmitRating = (rating: number, review: string) => {
    if(!selectedOrder) return;
    const updated = { 
        ...selectedOrder, 
        status: OrderStatus.CLOSED, 
        userRating: rating,
        userReview: review,
        timeline: [...selectedOrder.timeline, { title: '评价完成', timestamp: new Date().toISOString(), isActive: true }]
    };
    setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
    setSelectedOrder(updated);
    setIsRatingOpen(false);
    toast.success("评价成功，感谢您的反馈，我们将持续优化服务质量");
    setActiveTab('home');
  }

  // Chat Handlers
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = { id: Date.now().toString(), text: chatInput, sender: 'user' as const };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput("");
    
    // Fake reply
    setTimeout(() => {
        setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: "我已收到您的消息，稍后将有客服与您联系。", sender: 'agent' }]);
    }, 1000);
  };

  const handleSendOrder = (order: WorkOrder) => {
    const newMsg = { 
        id: Date.now().toString(), 
        text: `我对这个工单有问题: ${order.title}`, 
        sender: 'user' as const,
        order: order
    };
    setChatMessages(prev => [...prev, newMsg]);

    // Fake reply
    setTimeout(() => {
        setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: `正在为您查询 ${order.id} 的状态... 当前状态为：${order.status}。`, sender: 'agent' }]);
    }, 1000);
  }

  const formatDate = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleExportReport = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(20);
    doc.setTextColor(63, 81, 181); // Indigo color
    doc.text('SmartFix Cost Report', 14, 22);
    
    // Add Meta Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 30);
    doc.text(`User: ${'dongyanyan1914@gmail.com'}`, 14, 35);
    
    // Add Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 14, 48);
    doc.setFontSize(10);
    doc.text(`Available Balance: 24,850.00`, 14, 55);
    doc.text(`Points: 1,240`, 14, 60);
    
    // Prepare Table Data
    const tableData = orders
      .filter(o => (o.cost || 0) > 0)
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .map(order => [
        order.id,
        order.title,
        format(new Date(order.dateCreated), 'yyyy-MM-dd'),
        `¥${order.cost?.toFixed(2)}`,
        order.status === OrderStatus.CLOSED ? 'Settled' : 'Pending'
      ]);

    // Generate Table
    autoTable(doc, {
      startY: 70,
      head: [['Order ID', 'Description', 'Date', 'Amount', 'Status']],
      body: tableData,
      headStyles: { fillColor: [63, 81, 181] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 70 },
    });

    // Save PDF
    doc.save(`SmartFix_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div 
          className="flex items-center gap-2 text-slate-800 cursor-pointer active:opacity-70 transition-opacity"
        >
          <div 
            className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm shrink-0 relative group"
            onClick={() => avatarInputRef.current?.click()}
          >
            <img src={userAvatar} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload}
            />
          </div>
          <div onClick={() => setIsLocationPickerOpen(true)}>
            <h1 className="text-sm text-slate-500 font-medium flex items-center gap-1">
              当前位置 <ChevronRight size={12}/>
            </h1>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <MapPin size={16} className="text-emerald-600" />
              <span>{currentLocation}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            className="p-2 rounded-full hover:bg-slate-100 relative"
            onClick={() => setActiveTab('support')}
          >
            <Headphones size={24} className="text-slate-600" />
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <Card className="flex justify-between items-center !p-6">
        <div 
          onClick={() => handleStatClick('progress')}
          className="text-center flex-1 border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">进行中</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.progress}</p>
        </div>
        <div 
          onClick={() => handleStatClick('pending')}
          className="text-center flex-1 border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">待处理</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
        <div 
          onClick={() => handleStatClick('completed')}
          className="text-center flex-1 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">已完成</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.completed}</p>
        </div>
      </Card>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            setScannedEqId(null);
            setIsManualOpen(true);
          }}
          className="h-32 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <PenTool size={24} />
          </div>
          <span className="font-semibold text-slate-700">手动报修</span>
        </button>

        <button 
          onClick={() => setIsQRScannerOpen(true)}
          className="h-32 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Barcode size={24} />
          </div>
          <span className="font-semibold text-slate-700">智能识别</span>
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </div>

      {/* Important Notification Card */}
      <div 
        className="bg-white rounded-[2rem] p-4 flex items-center gap-4 shadow-sm border border-slate-50 cursor-pointer active:opacity-80 transition-opacity relative"
        onClick={() => {
          setIsNotificationsOpen(true);
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }}
      >
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 relative">
          <Bell size={20} />
          {hasUnreadNotifications && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </div>
        <p className="flex-1 text-sm font-medium text-slate-700 truncate">
          {notifications.find(n => !n.isRead)?.title || notifications[0].title}: {notifications.find(n => !n.isRead)?.message || notifications[0].message}
        </p>
        <ChevronRight size={18} className="text-slate-300" />
      </div>

      {/* Recent Activity (Preview) */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-lg font-bold text-slate-800">最近动态</h2>
          <button 
            onClick={() => setActiveTab('orders')}
            className="text-sm font-medium text-indigo-600 flex items-center gap-1 active:opacity-70 transition-opacity"
          >
            显示全部 <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-4">
          {orders.slice(0, 3).map((order) => {
            const isExpanded = expandedOrderIds.has(order.id);
            const isCompleted = order.status === OrderStatus.CLOSED || order.status === OrderStatus.PENDING_REVIEW || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.ARCHIVED;
            
            // Construct full lifecycle steps for the expanded view
            const progressSteps = [
                { title: '工单已创建', active: true, time: order.dateCreated },
                { title: '工程师已指派', active: !!order.engineer, time: order.engineer ? subMinutes(new Date(), 45).toISOString() : null },
                { title: '诊断/维修', active: order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.PENDING_ACCEPTANCE || order.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待验收', active: order.status === OrderStatus.PENDING_ACCEPTANCE || order.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待支付', active: order.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '已完成', active: isCompleted, time: null }
            ];

            return (
              <Card 
                key={order.id} 
                className="relative overflow-hidden group transition-all duration-300 ease-in-out cursor-pointer" 
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-amber-500'}`} />
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-mono text-slate-400 font-medium">{order.id}</span>
                       <span className="text-xs text-slate-400">• {formatDate(order.dateCreated)}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        {(order.status === OrderStatus.CLOSED || order.status === OrderStatus.PENDING_REVIEW || order.status === OrderStatus.ARCHIVED || order.status === OrderStatus.REFUNDING || order.status === OrderStatus.CANCELLED) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsAfterSalesOpen(true); }}
                            className="px-2.5 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-bold tracking-wide border border-cyan-100 transform active:scale-95 transition-transform"
                          >
                            售后
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}
                          className="transform active:scale-95 transition-transform"
                        >
                           <StatusBadge status={order.status} />
                        </button>
                     </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{order.title}</h3>
                        <p className="text-sm text-slate-500">{order.location}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-300"/> : <ChevronDown size={20} className="text-slate-300"/>}
                  </div>
                  
                  {/* Expanded Timeline */}
                  {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 origin-top">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">工单进度</h4>
                          <div className="space-y-4 pl-2 relative before:absolute before:left-[5px] before:top-1.5 before:bottom-1 before:w-[2px] before:bg-slate-100">
                                {progressSteps.map((step, idx) => (
                                     <div key={idx} className="relative flex items-start gap-3 z-10">
                                        <div className={`w-3 h-3 rounded-full border-2 mt-0.5 shrink-0 transition-colors duration-300 ${step.active ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}></div>
                                        <div>
                                            <p className={`text-xs font-semibold leading-none mb-1 ${step.active ? 'text-slate-700' : 'text-slate-400'}`}>{step.title}</p>
                                            {step.time && <p className="text-[10px] text-slate-400">{formatDate(step.time)}</p>}
                                        </div>
                                     </div>
                                ))}
                          </div>
                      </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => {
    if (!isNotificationsOpen) return null;

    return (
      <div className="absolute inset-0 z-[60] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-3 shadow-sm">
           <button onClick={() => setIsNotificationsOpen(false)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600"/>
           </button>
           <h2 className="font-bold text-lg text-slate-800">消息通知</h2>
        </div>

        <div className="p-4 space-y-3">
           {notifications.map(n => (
              <div key={n.id} className={`p-4 rounded-2xl border flex gap-4 transition-all active:scale-[0.99] ${n.isRead ? 'bg-white border-slate-100' : 'bg-white border-indigo-100 shadow-[0_4px_20px_rgba(79,70,229,0.05)] relative overflow-hidden'}`}>
                  {/* Unread Indicator Line */}
                  {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      {/* Icon logic based on notification type */}
                      {n.type === 'order' ? (
                          n.isRead ? <FileText size={20}/> : <FileText size={20} className="fill-current"/>
                      ) : n.type === 'system' ? (
                          n.isRead ? <SettingsIcon size={20}/> : <SettingsIcon size={20} className="fill-current"/>
                      ) : (
                          n.isRead ? <MailOpen size={20}/> : <Mail size={20} className="fill-current"/>
                      )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm truncate pr-2 ${n.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(n.timestamp)}</span>
                     </div>
                     <p className={`text-xs leading-relaxed line-clamp-2 ${n.isRead ? 'text-slate-500' : 'text-slate-600'}`}>{n.message}</p>
                  </div>
                  
                  {!n.isRead && <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></div>}
              </div>
           ))}
           <div className="text-center pt-4">
               <p className="text-xs text-slate-400">没有更多通知了</p>
           </div>
        </div>
      </div>
    )
  }

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;

    const canCancel = selectedOrder.status === OrderStatus.PENDING || selectedOrder.status === OrderStatus.ACCEPTED || selectedOrder.status === OrderStatus.PROCESSING;
    const isPayable = selectedOrder.status === OrderStatus.PENDING_PAYMENT;
    const isAcceptable = selectedOrder.status === OrderStatus.PENDING_ACCEPTANCE;
    const isCompleted = selectedOrder.status === OrderStatus.CLOSED || selectedOrder.status === OrderStatus.PENDING_REVIEW || selectedOrder.status === OrderStatus.CANCELLED || selectedOrder.status === OrderStatus.ARCHIVED;
    const canRate = (selectedOrder.status === OrderStatus.PENDING_REVIEW || selectedOrder.status === OrderStatus.CLOSED || selectedOrder.status === OrderStatus.ARCHIVED) && !selectedOrder.userRating;

    const completionEvent = selectedOrder.timeline.find(e => e.title === '已完成' || e.title === '维修完成' || e.title === '系统自动完成并好评' || e.title === '评价完成' || e.title === '工单已取消');
    const lastEvent = selectedOrder.timeline.length > 0 ? selectedOrder.timeline[selectedOrder.timeline.length - 1] : null;
    const completionTime = completionEvent ? new Date(completionEvent.timestamp) : (lastEvent ? new Date(lastEvent.timestamp) : null);
    const isWithin48Hours = completionTime ? (new Date().getTime() - completionTime.getTime()) / (1000 * 60 * 60) <= 48 : false;

    return (
      <div className="min-h-full bg-slate-50 relative">
        {/* Sticky Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
          <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} className="text-slate-700"/>
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">工单进度</h2>
            <p className="text-xs text-slate-500 font-mono">{selectedOrder.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {(selectedOrder.status === OrderStatus.CLOSED || selectedOrder.status === OrderStatus.PENDING_REVIEW || selectedOrder.status === OrderStatus.ARCHIVED || selectedOrder.status === OrderStatus.REFUNDING || selectedOrder.status === OrderStatus.CANCELLED) && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsAfterSalesOpen(true); }}
                className="px-2.5 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-bold tracking-wide border border-cyan-100 transform active:scale-95 transition-transform"
              >
                售后
              </button>
            )}
            <StatusBadge status={selectedOrder.status} />
          </div>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Map / Engineer Location */}
          {selectedOrder.status !== OrderStatus.CANCELLED && selectedOrder.status !== OrderStatus.CLOSED && selectedOrder.status !== OrderStatus.REFUNDING && (
            <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white relative h-48 group">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                   {selectedOrder.engineer ? (
                     <img src={selectedOrder.engineer.avatarUrl} alt="Eng" className="w-10 h-10 rounded-full object-cover"/>
                   ) : (
                     <User size={24} className="text-slate-400"/>
                   )}
                 </div>
              </div>
              {/* Simulated Path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
                <path d="M50,150 Q150,50 300,100" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="5,5"/>
              </svg>
              
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-sm border border-slate-100 flex justify-between items-center">
                {selectedOrder.engineer ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">
                        {[OrderStatus.ACCEPTED, OrderStatus.PENDING_VISIT, OrderStatus.PROCESSING, OrderStatus.PENDING_REVIEW, OrderStatus.PENDING_ACCEPTANCE, OrderStatus.PENDING_PAYMENT].includes(selectedOrder.status) 
                          ? `服务工程师` 
                          : '工程师位置'}
                      </p>
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                        {[OrderStatus.ACCEPTED, OrderStatus.PENDING_VISIT, OrderStatus.PROCESSING, OrderStatus.PENDING_REVIEW, OrderStatus.PENDING_ACCEPTANCE, OrderStatus.PENDING_PAYMENT].includes(selectedOrder.status) ? (
                          <User size={14} className="text-emerald-500"/>
                        ) : (
                          <MapIcon size={14} className="text-emerald-500"/>
                        )}
                        {[OrderStatus.ACCEPTED, OrderStatus.PENDING_VISIT, OrderStatus.PROCESSING, OrderStatus.PENDING_REVIEW, OrderStatus.PENDING_ACCEPTANCE, OrderStatus.PENDING_PAYMENT].includes(selectedOrder.status) 
                          ? selectedOrder.engineer.name 
                          : `距离 ${selectedOrder.engineer.distance}`}
                      </p>
                    </div>
                    <a href={`tel:${selectedOrder.engineer.phone}`} className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                      <Phone size={18} />
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 w-full justify-center py-1">
                     <Clock size={16} className="animate-spin-slow"/>
                     <span className="text-sm font-medium">等待工程师接单...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {selectedOrder.status === OrderStatus.CLOSED && (
            <Card className="bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 justify-center py-2">
                <CheckCircle size={18} className="text-emerald-500" />
                <span className="font-bold">工单已关闭</span>
              </div>
            </Card>
          )}

          {selectedOrder.status === OrderStatus.REFUNDING && (
            <Card className="bg-amber-50 border-amber-100">
              <div className="flex items-center gap-2 text-amber-600 justify-center py-2">
                <Loader2 size={18} className="animate-spin" />
                <span className="font-bold">工单退款中</span>
              </div>
            </Card>
          )}

          {/* User Review Section */}
          {selectedOrder.userRating && (
             <Card className="border-amber-100 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-2">
                   <Star size={18} className="text-amber-500 fill-amber-500"/>
                   <h3 className="font-bold text-slate-800">您的评价</h3>
                </div>
                <div className="flex gap-1 mb-2">
                   {[1,2,3,4,5].map(star => (
                      <Star key={star} size={16} className={`${star <= (selectedOrder.userRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}/>
                   ))}
                   <span className="text-xs font-bold text-slate-500 ml-2">{selectedOrder.userRating}.0</span>
                </div>
                {selectedOrder.userReview && (
                   <p className="text-sm text-slate-600 italic">"{selectedOrder.userReview}"</p>
                )}
             </Card>
          )}

          {/* Core Details */}
          <Card className="space-y-4">
             <div className="flex items-start gap-3">
               <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                  <MonitorSmartphone size={24}/>
               </div>
               <div>
                 <h3 className="font-bold text-slate-800">{selectedOrder.title}</h3>
                 <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedOrder.description || "无详细描述。"}</p>
                 <div className="flex gap-2 mt-2">
                    <UrgencyBadge level={selectedOrder.urgency} />
                    {selectedOrder.equipmentId && (
                       <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                          {EQUIPMENT_TYPES.find(e => e.id === selectedOrder.equipmentId)?.name || '设备'}
                       </span>
                    )}
                    {selectedOrder.cost && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold">
                         ¥{selectedOrder.cost}
                      </span>
                    )}
                 </div>
                 {selectedOrder.serialNumber && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-mono bg-slate-50 inline-block px-1.5 rounded">
                       <Barcode size={10} />
                       SN: {selectedOrder.serialNumber}
                    </div>
                 )}
                 {selectedOrder.scheduledTime && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-indigo-500 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded ml-1">
                       <CalendarClock size={10} />
                       预约: {selectedOrder.scheduledTime}
                    </div>
                 )}
               </div>
             </div>

             {selectedOrder.imageUrl && (
               <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                 <img src={selectedOrder.imageUrl} className="w-full h-full object-cover" alt="Fault"/>
               </div>
             )}

             <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">备注</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 border border-slate-100">
                  {selectedOrder.remarks || <span className="text-slate-400 italic">无额外备注。</span>}
                </div>
             </div>
          </Card>

          {/* Timeline */}
          <Card>
            <h3 className="font-bold text-slate-800 mb-4 text-sm">工单进度</h3>
            <div className="relative pl-2 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              {/* Combine static timeline with dynamic states for demo */}
              {[
                { title: '工单已创建', active: true, time: selectedOrder.dateCreated },
                { title: '工程师已指派', active: !!selectedOrder.engineer, time: selectedOrder.engineer ? subMinutes(new Date(), 45).toISOString() : null },
                { title: '诊断/维修', active: selectedOrder.status === OrderStatus.IN_PROGRESS || selectedOrder.status === OrderStatus.PENDING_ACCEPTANCE || selectedOrder.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待验收', active: selectedOrder.status === OrderStatus.PENDING_ACCEPTANCE || selectedOrder.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待支付', active: selectedOrder.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '已完成', active: isCompleted, time: null }
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3 z-10">
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${step.active ? 'border-emerald-500 text-emerald-500' : 'border-slate-200 text-slate-300'}`}>
                      {step.active && <div className="w-2 h-2 bg-emerald-500 rounded-full"/>}
                   </div>
                   <div className="-mt-1">
                      <p className={`text-sm font-semibold ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                      {step.time && <p className="text-[10px] text-slate-400">{formatDate(step.time)}</p>}
                   </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sticky Action Footer */}
        <div className="relative p-4 bg-white border-t border-slate-100 z-40 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           {canCancel && (
             <Button variant="secondary" className="flex-1 border-red-100 text-red-600 hover:bg-red-50" onClick={handleCancelOrder}>
               取消工单
             </Button>
           )}
           
           {isPayable && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" onClick={() => setIsPaymentOpen(true)}>
                确认并支付
              </Button>
           )}
           
           {isAcceptable && (
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700 shadow-orange-200 text-white" onClick={() => setIsAcceptanceOpen(true)}>
                开始验收
              </Button>
           )}
           
           {canRate && (
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white" onClick={() => setIsRatingOpen(true)}>
                评价服务
              </Button>
           )}

           {!canCancel && !isPayable && !isAcceptable && !canRate && !isCompleted && (
              <Button variant="ghost" className="flex-1 cursor-default opacity-50 bg-slate-100">
                 进行中
              </Button>
           )}

           {isCompleted && !canRate && (
              <div className="flex-1 flex gap-2">
                 {selectedOrder.status === OrderStatus.CANCELLED ? (
                   <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl font-bold border border-slate-100">
                      已取消
                   </div>
                 ) : (
                   <Button variant="outline" className="flex-1 border-slate-300 text-slate-500" disabled>
                      已关闭
                   </Button>
                 )}
              </div>
           )}
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    // If an order is selected, show details instead of list
    if (selectedOrder) {
      return renderOrderDetail();
    }

    const isTabActive = (status: string) => {
      if (filterStatus === status) return true;
      if (status === '进行中' && filterStatus === 'progress_group') return true;
      if (status === '已完成' && filterStatus === 'completed_group') return true;
      if (status === '待验收' && filterStatus === OrderStatus.PENDING_ACCEPTANCE) return true;
      if (status === '待评价' && filterStatus === OrderStatus.PENDING_REVIEW) return true;
      if (status === '退款中' && filterStatus === OrderStatus.REFUNDING) return true;
      // If the current filter is not in the common tabs, highlight '全部'
      const commonTabs = STATUS_FILTERS.slice(1);
      const groups = ['progress_group', 'completed_group', '进行中'];
      if (status === '全部' && !commonTabs.includes(filterStatus) && !groups.includes(filterStatus)) return true;
      return false;
    };

    return (
        <div className="bg-slate-50">
          
          {/* Header with Filters */}
          <div className="bg-white shadow-sm pb-1">
              <div className="p-4 pb-2 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">我的提单</h2>
                  <div className="bg-slate-100 rounded-full p-2 text-slate-500">
                      <Search size={20} />
                  </div>
              </div>

              {/* Status Tabs (Horizontal Scroll) */}
              <div className="relative">
                <div 
                  ref={scrollRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className={`flex overflow-x-auto no-scrollbar gap-2 px-4 pb-3 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {STATUS_FILTERS.map(status => (
                        <button
                            key={status}
                            onClick={() => {
                                if (hasMoved) return;
                                if (status === '全部') {
                                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                } else {
                                    setFilterStatus(status);
                                    setIsStatusDropdownOpen(false);
                                }
                            }}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                                isTabActive(status) 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {status === '全部' && filterStatus !== '全部' && !STATUS_FILTERS.includes(filterStatus) ? filterStatus : status}
                            {status === '全部' && <ChevronDown size={12} className={`transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />}
                        </button>
                    ))}
                </div>
                
                {/* Status Dropdown */}
                {isStatusDropdownOpen && (
                    <>
                        <div className="absolute inset-0 z-[90]" onClick={() => setIsStatusDropdownOpen(false)}></div>
                        <div className="absolute top-full left-4 mt-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] py-3 animate-in fade-in zoom-in-95 duration-200 grid grid-cols-2 gap-1 p-2">
                            {Object.values(OrderStatus).map(os => (
                                <button
                                    key={os}
                                    onClick={() => {
                                        setFilterStatus(os);
                                        setIsStatusDropdownOpen(false);
                                    }}
                                    className={`text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${filterStatus === os ? 'text-white bg-indigo-600 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {os}
                                </button>
                            ))}
                            <div className="col-span-2 h-px bg-slate-100 my-1 mx-2"></div>
                            <button
                                onClick={() => {
                                    setFilterStatus('全部');
                                    setIsStatusDropdownOpen(false);
                                }}
                                className={`col-span-2 text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${filterStatus === '全部' ? 'text-white bg-indigo-600 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                全部
                            </button>
                        </div>
                    </>
                )}
              </div>

              {/* Secondary Filter Bar */}
              <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                  {/* Date Filter */}
                  <div className="relative flex items-center">
                      <Calendar size={14} className="absolute left-3 text-slate-500 pointer-events-none"/>
                      <select 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                         {DATE_RANGES.map(range => (
                             <option key={range.value} value={range.value}>{range.label}</option>
                         ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none"/>
                  </div>

                  {/* Sort Control */}
                  <div className="flex items-center gap-1">
                      <div className="relative flex items-center">
                          <ArrowUpDown size={14} className="absolute left-3 text-slate-500 pointer-events-none"/>
                          <select 
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                          >
                             <option value="dateCreated">按报修时间</option>
                             <option value="dateClosed">按关闭时间</option>
                             <option value="category">按报修类别</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none"/>
                      </div>
                      <button 
                        onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        title={sortDirection === 'desc' ? "降序排列" : "升序排列"}
                      >
                        {sortDirection === 'desc' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpNarrowWide size={14} />}
                      </button>
                  </div>
              </div>
          </div>

          {/* Orders List */}
          <div className="p-4 space-y-4">
             {filteredOrders.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                     <div className="bg-slate-100 p-4 rounded-full mb-3">
                         <Filter size={32} />
                     </div>
                     <p className="text-sm font-medium">未找到工单</p>
                     <p className="text-xs">请尝试调整筛选条件</p>
                 </div>
             ) : (
                 filteredOrders.map(order => (
                    <Card key={order.id} onClick={() => handleOrderClick(order)} className="flex flex-col gap-3 group active:scale-[0.99] transition-transform duration-200 cursor-pointer hover:shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{order.id}</span>
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{formatDate(order.dateCreated)}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 leading-tight">{order.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={10}/> {order.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(order.status === OrderStatus.CLOSED || order.status === OrderStatus.PENDING_REVIEW || order.status === OrderStatus.ARCHIVED || order.status === OrderStatus.REFUNDING || order.status === OrderStatus.CANCELLED) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsAfterSalesOpen(true); }}
                              className="px-2.5 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-bold tracking-wide border border-cyan-100 transform active:scale-95 transition-transform"
                            >
                              售后
                            </button>
                          )}
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                      
                      {order.imageUrl && (
                        <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-100">
                          <img src={order.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Issue" />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-1">
                          <div className="flex items-center gap-2">
                             <UrgencyBadge level={order.urgency} />
                             {order.equipmentId && (
                                 <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium uppercase tracking-wide">
                                     {EQUIPMENT_TYPES.find(e => e.id === order.equipmentId)?.name || '设备'}
                                 </span>
                             )}
                          </div>
                          <Button variant="ghost" className="!p-0 !h-auto text-indigo-600 text-xs font-bold hover:bg-transparent">
                              查看进度 <ChevronRight size={14} className="ml-0.5"/>
                          </Button>
                      </div>
                    </Card>
                 ))
             )}
             <div className="text-center text-xs text-slate-300 py-4">
                 显示 {filteredOrders.length} 个工单
             </div>
          </div>
        </div>
    );
  };

  // --- REVAMPED MANUAL FORM ---
  const ManualFormModal = () => {
    // Form Local State
    const [selectedEq, setSelectedEq] = useState<string | null>(scannedEqId);
    const [selectedFault, setSelectedFault] = useState<string | null>(null);
    const [manualPhotos, setManualPhotos] = useState<string[]>([]);
    const [manualVideo, setManualVideo] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [remarks, setRemarks] = useState('');
    const [isDictating, setIsDictating] = useState(false);
    const dictationRef = useRef<any>(null);

    const toggleDictation = () => {
       if (isDictating) {
           if (dictationRef.current) dictationRef.current.stop();
           setIsDictating(false);
           return;
       }

       const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
       if (!SpeechRecognition) {
           toast.error("当前浏览器不支持内建语音识别，请直接键入。");
           return;
       }

       try {
           const recognition = new SpeechRecognition();
           recognition.lang = 'zh-CN';
           recognition.interimResults = true;
           recognition.continuous = true;

           // To prevent stale closure state, we use a mutable reference or fetch latest state using setRemarks functional callback
           // Actually, since remarks changes, the closure previousText might get stale if user types.
           // Better to use setRemarks(prev => ...)
           let interimStartText = remarks;

           recognition.onresult = (e: any) => {
               let interim = '';
               let final = '';
               for (let i = e.resultIndex; i < e.results.length; i++) {
                   if (e.results[i].isFinal) {
                       final += e.results[i][0].transcript;
                   } else {
                       interim += e.results[i][0].transcript;
                   }
               }
               if (final) {
                   interimStartText += final;
                   setRemarks(interimStartText);
               } else {
                   setRemarks(interimStartText + interim);
               }
           };

           recognition.onerror = (e: any) => {
               console.error('Speech recognition error', e.error);
               setIsDictating(false);
           };

           recognition.onend = () => {
               setIsDictating(false);
           };

           dictationRef.current = recognition;
           recognition.start();
           setIsDictating(true);
           toast.info("请开始说话...");
       } catch (err) {
           console.error(err);
           setIsDictating(false);
       }
    };

    const [serialNumber, setSerialNumber] = useState('');
    const [scheduledTime, setScheduledTime] = useState('尽快上门');
    const [customDate, setCustomDate] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const manualFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isManualOpen) {
        if (scannedEqId) {
          setSelectedEq(scannedEqId);
        } else {
          // Reset form when opened manually
          setSelectedEq(null);
          setSelectedFault(null);
          setManualPhotos([]);
          setManualVideo(null);
          setRemarks('');
          setScheduledTime('尽快上门');
          setCustomDate('');
          setIsScheduled(false);
        }
      }
    }, [isManualOpen, scannedEqId]);

    const currentEquipment = useMemo(() => EQUIPMENT_TYPES.find(e => e.id === selectedEq), [selectedEq]);
    
    // Dynamic Pricing Calculation
    const currentPrice = useMemo(() => {
        if (!currentEquipment) return 0;
        if (selectedFault) {
            const issue = currentEquipment.issues.find(i => i.name === selectedFault);
            // If the selected issue has a specific price, use it, otherwise use base price
            return issue ? issue.price : currentEquipment.basePrice;
        }
        return currentEquipment.basePrice;
    }, [currentEquipment, selectedFault]);

    if (!isManualOpen) return null;

    const handleManualSubmit = () => {
       const title = currentEquipment ? currentEquipment.name : "设备维修报修";
       const desc = remarks || "客户未提供文本描述";
       const finalTime = isScheduled ? (scheduledTime === 'custom' ? customDate : scheduledTime) : "非预约单";

       handleCreateOrder(false, { 
           title, 
           description: desc, 
           image: manualPhotos[0],
           imageUrls: manualPhotos,
           videoUrl: manualVideo,
           equipmentId: scannedEqId || undefined,
           serialNumber: serialNumber,
           cost: currentEquipment ? currentEquipment.basePrice : 50,
           scheduledTime: finalTime
       });
    };

    const handleManualPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
       const files = Array.from(e.target.files || []) as File[];
       files.forEach(file => {
         const reader = new FileReader();
         reader.onloadend = () => {
           setManualPhotos(prev => [...prev, reader.result as string]);
         };
         reader.readAsDataURL(file);
       });
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play();
        }
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        videoChunksRef.current = [];

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            videoChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setManualVideo(url);
          if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        let time = 0;
        recordingIntervalRef.current = setInterval(() => {
          time += 1;
          setRecordingTime(time);
          if (time >= 10) {
            stopRecording();
          }
        }, 1000);
      } catch (err) {
        console.error("Error accessing media devices:", err);
        toast.error("无法访问摄像头或麦克风");
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
    };

    return (
       <div className="absolute inset-0 z-[60] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
        <div className="bg-white w-full flex flex-col min-h-full">
          
          {/* Header */}
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button onClick={() => setIsManualOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">{scannedEqId ? '智能识别报修' : '手动报修'}</h3>
              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><MapPin size={10}/> {currentLocation}</p>
            </div>
            <div className="w-10" />
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-6 bg-white">
             
             {/* Step 1: Fault Description */}
             <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-opacity duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="font-semibold text-slate-800">问题描述</h4>
                </div>

                <label className="block text-xs font-bold text-slate-700 mb-1.5 px-1 uppercase tracking-wider">故障详情</label>
                <div className="relative">
                  <textarea 
                    value={remarks}
                    onChange={(e) => {
                        setRemarks(e.target.value);
                        if (isDictating && dictationRef.current) {
                           dictationRef.current.stop();
                           setIsDictating(false);
                        }
                    }}
                    className={`w-full p-3 bg-white border rounded-xl outline-none text-sm min-h-[120px] pb-12 transition-colors ${isDictating ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20'}`} 
                    placeholder="请在此详细描述故障现象，例如：设备无法正常开机，指示灯闪烁..."
                  />
                  <button
                    onClick={toggleDictation}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${isDictating ? 'bg-indigo-600 text-white shadow-md animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-indigo-600'}`}
                    title={isDictating ? "停止语音输入" : "开始语音输入"}
                  >
                    <Mic size={18} fill={isDictating ? "currentColor" : "none"} />
                  </button>
                </div>
             </div>

             {/* Step 2: Evidence */}
             <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                 <h4 className="font-semibold text-slate-800">照片/视频凭证 (可选)</h4>
               </div>
               
               <div className="space-y-3">
                 {/* Video Recording Section */}
                 {!manualVideo && !isRecording && (
                   <button 
                     onClick={startRecording}
                     className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-indigo-400 hover:text-indigo-500 transition-all"
                   >
                     <Video size={24} className="mb-2" />
                     <span className="text-xs font-medium">录制视频 (限10秒)</span>
                   </button>
                 )}

                 {isRecording && (
                   <div className="relative rounded-xl overflow-hidden shadow-sm border border-indigo-200 bg-black">
                     <video ref={videoPreviewRef} className="w-full h-40 object-cover opacity-50" muted />
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mb-2" />
                       <span className="text-white font-mono font-bold">{recordingTime}s / 10s</span>
                       <button 
                         onClick={stopRecording}
                         className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
                       >
                         <StopCircle size={16} /> 停止录制
                       </button>
                     </div>
                   </div>
                 )}

                 {manualVideo && !isRecording && (
                   <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
                     <video src={manualVideo} className="w-full h-40 object-cover" controls />
                     <button 
                       onClick={() => setManualVideo(null)}
                       className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 )}

                 {/* Photos Section */}
                 <div className="grid grid-cols-3 gap-2">
                   {manualPhotos.map((photo, index) => (
                     <div key={index} className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group aspect-square">
                       <img src={photo} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                       <button 
                         onClick={() => setManualPhotos(prev => prev.filter((_, i) => i !== index))}
                         className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <Trash2 size={12} />
                       </button>
                     </div>
                   ))}
                   <div 
                      onClick={() => manualFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all aspect-square"
                   >
                      <ImagePlus size={20} className="mb-1"/>
                      <span className="text-[10px] font-medium">上传照片</span>
                   </div>
                 </div>
                 <input type="file" ref={manualFileRef} className="hidden" accept="image/*" multiple onChange={handleManualPhotoUpload}/>
               </div>
             </div>

             {/* Step 3: Scheduled Time */}
             {!isScheduled ? (
                <button 
                  onClick={() => setIsScheduled(true)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">3</div>
                    <h4 className="font-semibold">预约上门 (可选)</h4>
                  </div>
                  <ChevronRight size={18} />
                </button>
             ) : (
               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                     <h4 className="font-semibold text-slate-800">预约上门 (可选)</h4>
                   </div>
                   <button onClick={() => setIsScheduled(false)} className="text-xs text-slate-400 hover:text-slate-600">取消预约</button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 mb-3">
                   {['尽快上门', '今天下午', '明天上午', 'custom'].map(time => (
                     <button
                       key={time}
                       onClick={() => setScheduledTime(time)}
                       className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                         scheduledTime === time 
                         ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                         : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                       }`}
                     >
                       {time === 'custom' ? '选择具体时间' : time}
                     </button>
                   ))}
                 </div>

                 {scheduledTime === 'custom' && (
                   <div className="animate-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                          type="datetime-local"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                        />
                      </div>
                   </div>
                 )}
               </div>
             )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-white pb-6 sm:pb-4 flex flex-col gap-3">
             {/* Price Display */}
             {selectedEq && (
               <div className="flex justify-between items-center px-2">
                 <span className="text-sm font-medium text-slate-500">预计基础费用</span>
                 <span className="text-xl font-bold text-slate-800 flex items-center gap-1">
                    <Tag size={16} className="text-emerald-500"/>
                    ¥{currentPrice}
                 </span>
               </div>
             )}
             
             <Button fullWidth onClick={handleManualSubmit} disabled={!selectedEq}>
               提交工单
             </Button>
          </div>

        </div>
       </div>
    );
  }

  // --- NEW MISSING COMPONENTS ---

  const renderSupport = () => (
    <div className="bg-slate-50 relative">
       {/* Header */}
       <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
             <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">智能客服</h2>
            <p className="text-xs text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> 在线</p>
          </div>
       </div>

       {/* Chat Area */}
       <div className="p-4 space-y-4">
          {chatMessages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                   {msg.order && (
                      <div className="mb-2 p-2 bg-white/10 rounded-lg border border-white/10">
                          <p className="font-bold text-xs opacity-80">工单: {msg.order.id}</p>
                          <p className="font-bold">{msg.order.title}</p>
                      </div>
                   )}
                   {msg.text}
                </div>
             </div>
          ))}
          <div ref={chatEndRef} />
       </div>

       {/* Input Area */}
       <div className="p-3 bg-white border-t border-slate-100 relative z-20">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 pb-3">
             {[
               "如何在账户绑定我的门店 / 企业信息",
               "报修服务的费用是怎么计算的",
               "账户余额如何提现 / 退款",
               "如何为账户充值",
               "400服务台联系方式"
             ].map((prompt, idx) => (
               <button
                 key={idx}
                 onClick={() => setChatInput(prompt)}
                 className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
               >
                 {prompt}
               </button>
             ))}
          </div>
          
          <div className="flex gap-2 items-end">
             <textarea 
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSendMessage();
                 }
               }}
               placeholder="描述您的问题..."
               className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] resize-none"
             />
             <button 
               onClick={handleSendMessage}
               disabled={!chatInput.trim()}
               className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end mb-1"
             >
                <Send size={20} />
             </button>
          </div>
       </div>
    </div>
  );

  const QRScannerModal = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
      if (!isQRScannerOpen) return;
      
      let stream: MediaStream | null = null;
      let animationFrameId: number;

      const startScanner = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            videoRef.current.play();
            requestAnimationFrame(tick);
          }
        } catch (err) {
          console.error("Camera error:", err);
          toast.error("无法访问相机，请检查权限");
        }
      };

      const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              if (code) {
                console.log("Found QR code", code.data);
                handleScanSuccess(code.data);
                return; // Stop scanning
              }
            }
          }
        }
        if (isScanning) {
          animationFrameId = requestAnimationFrame(tick);
        }
      };

      startScanner();

      return () => {
        setIsScanning(false);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }, [isQRScannerOpen]);

    const handleScanSuccess = (data: string) => {
      setIsScanning(false);
      // Try to match data to an equipment ID. If not found, use a random one or default.
      const eq = EQUIPMENT_TYPES.find(e => e.id === data || data.includes(e.id));
      const finalEqId = eq ? eq.id : 'pos-1'; // Default to pos-1 if unrecognized
      
      toast.success("扫码成功！已识别设备信息");
      setIsQRScannerOpen(false);
      setScannedEqId(finalEqId);
      setIsManualOpen(true);
    };

    if (!isQRScannerOpen) return null;

    return (
      <div className="absolute inset-0 z-[60] bg-black flex flex-col">
         <div className="relative flex-1">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-emerald-500 rounded-2xl relative">
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-2xl -mt-1 -ml-1"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-2xl -mt-1 -mr-1"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-2xl -mb-1 -ml-1"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-2xl -mb-1 -mr-1"></div>
                 <div className="absolute left-0 right-0 h-0.5 bg-emerald-500/50 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-scan"></div>
              </div>
            </div>

            <button onClick={() => setIsQRScannerOpen(false)} className="absolute top-6 right-6 z-10 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-colors pointer-events-auto">
               <X size={24} />
            </button>
            
            <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-auto">
               <p className="text-white/80 text-sm font-medium bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                 将二维码放入框内，即可自动扫描
               </p>
               <button 
                 onClick={() => handleScanSuccess('pos-1')}
                 className="block mx-auto mt-4 text-xs text-emerald-400 underline opacity-50"
               >
                 模拟扫码成功
               </button>
            </div>
         </div>
      </div>
    );
  };

  const SmartRepairModal = () => {
    if (!isCameraOpen) return null;

    return (
      <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => { setIsCameraOpen(false); setSelectedImage(null); setAnalysisResult(null); }} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-md transition-colors">
               <X size={20} />
            </button>

            {/* Image Preview Area */}
            <div className="relative aspect-square bg-slate-900">
               {selectedImage && <img src={selectedImage} alt="Analysis" className="w-full h-full object-cover" />}
               
               {isAnalyzing && (
                 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                    <Loader2 size={48} className="animate-spin mb-4 text-emerald-400" />
                    <p className="font-bold text-lg animate-pulse">正在智能分析...</p>
                    <p className="text-xs text-white/70 mt-2">识别设备 • 诊断故障 • 估算费用</p>
                 </div>
               )}
            </div>

            {/* Result Area */}
            {!isAnalyzing && analysisResult && (
               <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                     <Sparkles className="text-emerald-500" size={20} />
                     <h3 className="font-bold text-slate-800 text-lg">分析完成</h3>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 mb-1 font-bold uppercase">识别结果</p>
                        <h4 className="font-bold text-slate-800">{analysisResult.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{analysisResult.description}</p>
                     </div>
                     
                     <div className="flex gap-3">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                           <p className="text-xs text-slate-400 mb-1">紧急程度</p>
                           <UrgencyBadge level={analysisResult.urgency} />
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                           <p className="text-xs text-slate-400 mb-1">分类</p>
                           <span className="text-xs font-bold text-slate-700">{analysisResult.category}</span>
                        </div>
                     </div>

                     <Button fullWidth onClick={() => handleCreateOrder(true)}>
                        生成工单
                     </Button>
                  </div>
               </div>
            )}
            
            {!isAnalyzing && !analysisResult && (
               <div className="p-8 text-center text-slate-500">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2"/>
                  正在准备分析...
               </div>
            )}
         </div>
      </div>
    );
  };

  const VoiceRepairModal = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [voiceAnalysis, setVoiceAnalysis] = useState<AnalysisResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const [messages, setMessages] = useState<{role: 'bot' | 'user', content: string | React.ReactNode, type?: 'text' | 'image'}[]>([
       { role: 'bot', content: '您好，请问是哪个设备发生了什么故障？' }
    ]);

    useEffect(() => {
       if (isVoiceOpen) {
          setMessages([{ role: 'bot', content: '您好，请问是哪个设备发生了什么故障？' }]);
          setVoiceAnalysis(null);
          setIsRecording(false);
          setIsProcessing(false);
          setAudioBlob(null);
       }
    }, [isVoiceOpen]);

    if (!isVoiceOpen) return null;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          handleVoiceAnalyze(blob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        toast.error("无法访问麦克风，请检查权限。");
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    };

    const handleVoiceAnalyze = (blob: Blob) => {
      setMessages(p => [...p, { role: 'user', content: '🎙️ 已录入语音，正在分析...' }]);
      setIsProcessing(true);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
           const result = await analyzeRepairAudio(base64data);
           setVoiceAnalysis(result);
           setMessages(p => {
               const newM = [...p];
               newM[newM.length - 1] = { role: 'user', content: result.description || '语音识别成功' };
               return newM;
           });
           setTimeout(() => {
               setMessages(p => [...p, { role: 'bot', content: '分析完成！请确认下方生成的工单信息。' }]);
           }, 500);
        } catch (e) {
           console.error(e);
           toast.error("语音分析失败，请重试。");
           setMessages(p => {
               const newM = [...p];
               newM.pop(); // remove recording message
               return [...newM, { role: 'bot', content: '抱歉，我没有听清，请重试或拍摄照片。' }];
           });
        } finally {
           setIsProcessing(false);
        }
      };
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            setMessages(p => [...p, { role: 'user', content: <img src={dataUrl} alt="上传" className="max-w-[200px] h-auto object-cover rounded-lg" />, type: 'image' }]);
            setIsProcessing(true);
            try {
                const result = await analyzeRepairImage(dataUrl);
                setVoiceAnalysis(result);
                setTimeout(() => {
                    setMessages(p => [...p, { role: 'bot', content: '这是一张设备故障照片。分析已完成，请确认下方的工单信息。' }]);
                }, 500);
            } catch (err) {
                console.error(err);
                toast.error("图片分析失败，请尝试重新上传。");
                setMessages(p => [...p, { role: 'bot', content: '没能识别这张图片，这可能不是一张有效的设备故障照片，请重新上传。' }]);
            } finally {
               setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const confirmOrder = () => {
        if (voiceAnalysis) {
            setAnalysisResult(voiceAnalysis);
            handleCreateOrder(true);
            setIsVoiceOpen(false);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isRecording]);

    return (
       <div className="absolute inset-0 z-[60] bg-[#FAFAFA] flex flex-col pt-[5vh]">
          <button onClick={() => { setIsVoiceOpen(false); }} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-200 rounded-full z-10 transition-colors">
              <X size={24} />
          </button>
          
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 flex flex-col pb-64 no-scrollbar">
              {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'bot' && (
                          <div className="w-10 h-10 rounded-full bg-[#4f46e5] flex items-center justify-center shrink-0 shadow-sm text-white">
                              <Bot size={20} />
                          </div>
                      )}
                      
                      <div className={`max-w-[80%] p-4 ${msg.role === 'bot' ? 'bg-white rounded-2xl rounded-tl-sm text-slate-800 shadow-sm text-[15px] leading-relaxed' : 'bg-slate-100 rounded-2xl rounded-tr-sm text-slate-800 text-[15px] leading-relaxed'}`}>
                          {msg.content}
                      </div>

                      {msg.role === 'user' && (
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                              <img src={userAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="User" />
                          </div>
                      )}
                  </div>
              ))}
              
              {isRecording && (
                  <div className="flex gap-3 justify-end items-center animate-in slide-in-from-bottom-2">
                      <div className="max-w-[80%] p-4 bg-slate-100 rounded-2xl rounded-tr-sm text-slate-800 flex items-center gap-2">
                           <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                           <span className="text-slate-500 text-sm">正在聆听...</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                          <img src={userAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="User" />
                      </div>
                  </div>
              )}

              {isProcessing && !isRecording && (
                  <div className="flex gap-3 justify-start animate-in slide-in-from-bottom-2">
                      <div className="w-10 h-10 rounded-full bg-[#4f46e5] flex items-center justify-center shrink-0 shadow-sm text-white">
                          <Bot size={20} />
                      </div>
                      <div className="p-4 bg-white rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3 text-slate-500">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-sm">思考中...</span>
                      </div>
                  </div>
              )}

              {voiceAnalysis && !isProcessing && (
                  <div className="animate-in slide-in-from-bottom-4 flex justify-center mt-6">
                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-[90%] max-w-xs relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle size={18} />
                                <span className="font-bold text-sm">工单已生成</span>
                            </div>
                            <UrgencyBadge level={voiceAnalysis.urgency || UrgencyLevel.MEDIUM} />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{voiceAnalysis.title}</h4>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-3">{voiceAnalysis.description}</p>
                        <Button fullWidth onClick={confirmOrder}>确认并派单</Button>
                     </div>
                  </div>
              )}
              <div ref={messagesEndRef} className="h-4"></div>
          </div>

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent pt-16 pb-8 px-6 flex flex-col items-center pointer-events-none">
              <div className="relative flex items-center justify-center mb-6 pointer-events-auto">
                  {isRecording && (
                     <>
                        <div className="absolute w-40 h-40 bg-indigo-500/10 rounded-full animate-ping pointer-events-none"></div>
                        <div className="absolute w-32 h-32 bg-indigo-500/20 rounded-full animate-pulse delay-75 pointer-events-none"></div>
                     </>
                  )}
                  <button 
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform active:scale-95 ${isRecording ? 'bg-indigo-600 scale-105 shadow-indigo-200' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                  >
                     <Mic size={36} />
                  </button>
              </div>
              <p className="text-indigo-400/80 text-sm mb-6 font-medium tracking-wide">
                  {isRecording ? '正在聆听，点击停止' : '点击麦克风说话'}
              </p>
              
              <div className="flex gap-4 w-full pointer-events-auto">
                  <button onClick={() => { setIsVoiceOpen(false); setIsManualOpen(true); }} className="flex-1 py-3.5 bg-slate-200/60 hover:bg-slate-200 text-slate-600 font-semibold rounded-[1rem] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                     <Keyboard size={18} className="text-slate-500" /> 键盘输入
                  </button>
                  <label className="flex-1 py-3.5 bg-slate-200/60 hover:bg-slate-200 text-slate-600 font-semibold rounded-[1rem] flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]">
                     <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                     <Camera size={18} className="text-slate-500" /> 上传照片
                  </label>
              </div>
          </div>
       </div>
    );
  };

  const LocationPickerModal = () => {
     if (!isLocationPickerOpen) return null;
     
     const locations = [
        '上海中心大厦, 上海',
        '环球金融中心, 上海',
        '金茂大厦, 上海',
        '外滩SOHO, 上海',
        '虹桥天地, 上海'
     ];

     return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-slate-800">切换位置</h3>
                 <button onClick={() => setIsLocationPickerOpen(false)}><X size={20} className="text-slate-400"/></button>
              </div>
              <div className="space-y-2">
                 {locations.map(loc => (
                    <button 
                      key={loc} 
                      onClick={() => handleLocationSelect(loc)}
                      className={`w-full p-4 rounded-xl flex items-center gap-3 text-left transition-colors ${currentLocation === loc ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                       <MapPin size={20} className={currentLocation === loc ? 'text-emerald-500' : 'text-slate-400'} />
                       <span className="font-medium">{loc}</span>
                       {currentLocation === loc && <CheckCircle size={16} className="ml-auto text-emerald-500"/>}
                    </button>
                 ))}
                 <button className="w-full p-4 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-indigo-600 font-medium border border-dashed border-indigo-200 justify-center">
                    <Navigation size={18} />
                    使用当前定位
                 </button>
              </div>
           </div>
        </div>
     );
  };

  const EditRemarksModal = () => {
    if (!isEditRemarksOpen) return null;
    return (
       <div className="absolute inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
             <h3 className="font-bold text-slate-800 mb-4">修改备注</h3>
             <textarea 
               value={editRemarksValue}
               onChange={(e) => setEditRemarksValue(e.target.value)}
               className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
               placeholder="输入新的备注信息..."
             />
             <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsEditRemarksOpen(false)}>取消</Button>
                <Button fullWidth onClick={handleUpdateRemarks}>保存</Button>
             </div>
          </div>
       </div>
    );
  };

  const RateServiceModal = () => {
     const [rating, setRating] = useState(0);
     const [review, setReview] = useState('');
     const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

     if (!isRatingOpen || !selectedOrder) return null;
 
     const getStarWidth = (starIndex: number) => {
        if (rating >= starIndex) return '100%';
        if (rating === starIndex - 0.5) return '50%';
        return '0%';
     };

     const getRatingLabel = (val: number) => {
        if (val >= 5) return '非常满意';
        if (val >= 4) return '满意';
        if (val >= 3) return '一般';
        if (val >= 2) return '不满意';
        if (val >= 1) return '很不满意';
        return '请评分';
     };

     const reasons = ["服务态度差", "技术不专业", "上门超时", "问题未解决", "有额外收费"];

     const toggleReason = (reason: string) => {
        let next;
        if (selectedReasons.includes(reason)) {
           next = selectedReasons.filter(r => r !== reason);
        } else {
           next = [...selectedReasons, reason];
        }
        setSelectedReasons(next);
        setReview(next.join('、'));
     };

     return (
        <div className="absolute inset-0 z-[100] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
           <div className="bg-white w-full flex flex-col min-h-full">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-10 bg-white">
                 <button onClick={() => setIsRatingOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
                   <ChevronLeft size={24} className="text-slate-600" />
                 </button>
                 <h3 className="font-bold text-lg text-slate-800">服务评价</h3>
                 <div className="w-10" />
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                 <div className="text-center mb-6">
                    <p className="text-sm text-slate-500">请对本次维修服务进行打分</p>
                 </div>
              
              <div className="flex flex-col items-center gap-2 mb-6">
                 <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                       <div key={starIndex} className="relative w-8 h-8">
                          {/* Background Star (Gray) */}
                          <Star 
                             size={32} 
                             className="text-slate-200"
                             strokeWidth={1.5}
                          />
                          
                          {/* Foreground Star (Yellow) with clipping */}
                          <div 
                             className="absolute inset-0 overflow-hidden pointer-events-none"
                             style={{ width: getStarWidth(starIndex) }}
                          >
                             <Star 
                                size={32} 
                                className="text-amber-400 fill-amber-400"
                                strokeWidth={1.5}
                             />
                          </div>

                          {/* Interactive areas - placed on top */}
                          <div className="absolute inset-0 flex">
                             <div 
                                className="w-1/2 h-full cursor-pointer z-10" 
                                onClick={() => setRating(starIndex - 0.5)}
                             />
                             <div 
                                className="w-1/2 h-full cursor-pointer z-10" 
                                onClick={() => setRating(starIndex)}
                             />
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="text-sm font-medium text-amber-500 h-5">
                    {getRatingLabel(rating)}
                 </div>
              </div>

              {rating > 0 && rating <= 2 && (
                 <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">请选择不满意的原因 (可多选)</label>
                    <div className="flex flex-wrap gap-2">
                       {reasons.map(reason => (
                          <button
                             key={reason}
                             onClick={() => toggleReason(reason)}
                             className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                selectedReasons.includes(reason)
                                   ? 'bg-indigo-600 text-white shadow-md'
                                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                             }`}
                          >
                             {reason}
                          </button>
                       ))}
                    </div>
                 </div>
              )}
              
              <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">评价内容 (选填)</label>
                 <textarea 
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                    placeholder="请输入您的评价，例如：师傅很专业..."
                 />
              </div>

              <div className="flex gap-3 mt-auto pt-6">
                 <Button variant="secondary" fullWidth onClick={() => setIsRatingOpen(false)}>暂不评价</Button>
                 <Button fullWidth onClick={() => handleSubmitRating(rating, review)}>提交评价</Button>
              </div>
            </div>
           </div>
        </div>
     );
  }

  const CancelOrderModal = () => {
     if (!isCancelModalOpen || !selectedOrder) return null;
     return (
        <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
                     <AlertTriangle size={32} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">确认取消工单？</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                     {cancelModalMessage}
                  </p>
                  
                  <div className="flex flex-col w-full gap-2">
                     <Button fullWidth variant="secondary" className="text-red-600 border-red-100 hover:bg-red-50" onClick={confirmCancelOrder}>
                        确认取消
                     </Button>
                     <Button fullWidth variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
                        返回
                     </Button>
                  </div>
               </div>
            </div>
        </div>
     );
  };

  const SignatureModal = () => {
     const canvasRef = useRef<HTMLCanvasElement>(null);
     const [isDrawing, setIsDrawing] = useState(false);
     const [hasSigned, setHasSigned] = useState(false);

     useEffect(() => {
        if (isSignatureOpen && canvasRef.current) {
           const canvas = canvasRef.current;
           const ctx = canvas.getContext('2d');
           if (ctx) {
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 3;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
           }
        }
     }, [isSignatureOpen]);

     const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        setHasSigned(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
           const rect = canvas.getBoundingClientRect();
           const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
           const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
           ctx.beginPath();
           ctx.moveTo(x, y);
        }
     };

     const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
           const rect = canvas.getBoundingClientRect();
           const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
           const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
           ctx.lineTo(x, y);
           ctx.stroke();
        }
        if (e.cancelable) e.preventDefault();
     };

     const stopDrawing = () => {
        setIsDrawing(false);
     };

     const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           setHasSigned(false);
        }
     };

     if (!isSignatureOpen || !selectedOrder) return null;

     return (
        <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">电子签名确认</h3>
                  <button onClick={() => setIsSignatureOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>

               <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-4">请在下方区域内签字，确认维修工作已按要求完成：</p>
                  <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden touch-none">
                     <canvas 
                        ref={canvasRef}
                        width={400}
                        height={200}
                        className="w-full h-[200px] cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                     />
                     {!hasSigned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                           <Edit3 size={48} className="text-slate-300" />
                        </div>
                     )}
                     <button 
                        onClick={clearCanvas}
                        className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-orange-600 transition-colors"
                        title="清除"
                     >
                        <RotateCcw size={18} />
                     </button>
                  </div>
               </div>

               <div className="flex gap-3">
                  <Button 
                     variant="outline" 
                     className="flex-1" 
                     onClick={() => setIsSignatureOpen(false)}
                  >
                     返回
                  </Button>
                  <Button 
                     className="flex-[2] bg-orange-600 hover:bg-orange-700 disabled:opacity-50" 
                     disabled={!hasSigned}
                     onClick={handleSignatureComplete}
                  >
                     确认并支付
                  </Button>
               </div>
            </div>
        </div>
     );
  };

  const AfterSalesModal = () => {
    if (!isAfterSalesOpen || !selectedOrder) return null;

    return (
      <div className="absolute inset-0 z-[60] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300 flex flex-col transform-gpu">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-colors duration-300 pt-6 border-b border-slate-100">
          <div className="flex justify-between items-center px-6 py-4 w-full">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsAfterSalesOpen(false)} className="active:scale-95 duration-200 ease-in-out text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="font-bold text-xl tracking-tight text-slate-800">售后服务</h1>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 space-y-6 flex-1 pb-24 top-0">
          {/* Header Visual / Status Section */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-lg">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-90 font-medium font-mono">工单编号: {selectedOrder.id}</p>
                  <h2 className="text-2xl font-bold mt-1">
                    {selectedOrder.status === OrderStatus.CLOSED || selectedOrder.status === OrderStatus.PENDING_REVIEW || selectedOrder.status === OrderStatus.ARCHIVED ? '服务已完成' : 
                     selectedOrder.status === OrderStatus.REFUNDING ? '退款处理中' : '工单已取消'}
                  </h2>
                </div>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10">
                  {selectedOrder.status}
                </span>
              </div>
              <p className="mt-4 text-sm opacity-90 leading-relaxed max-w-[90%]">
                感谢您对本次服务的支持。如有任何不满意或设备复发故障，请及时联系我们。
              </p>
            </div>
            {/* Decorative Background Element */}
            <div className="absolute -right-6 -bottom-6 opacity-20 transform rotate-12">
              <Wrench className="w-32 h-32" />
            </div>
          </section>

          {/* Main Content Area: Bento Style */}
          <div className="flex flex-col gap-4">
            {selectedOrder.status === OrderStatus.PENDING_REVIEW && (
              <button 
                onClick={() => {
                  setIsAfterSalesOpen(false);
                  setIsRatingOpen(true);
                }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 shadow-sm active:scale-[0.98] transition-transform text-left border border-amber-200 hover:bg-amber-100/50"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full shrink-0">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800">评价本次服务</h3>
                  <p className="text-xs text-amber-600/80 mt-1">您的反馈对我们非常重要</p>
                </div>
              </button>
            )}

            {/* Reopen Ticket Card */}
            <button 
              onClick={() => {
                setIsAfterSalesOpen(false);
                setIsReopenTicketOpen(true);
              }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm active:scale-[0.98] transition-transform text-left border border-slate-100/50 hover:bg-slate-50"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-full shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">申请重新开启工单</h3>
                <p className="text-xs text-slate-500 mt-1">设备故障未解决或复发</p>
              </div>
            </button>

            {/* Online Invoice Card */}
            <button 
              onClick={() => {
                setIsAfterSalesOpen(false);
                setIsInvoiceModalOpen(true);
              }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm active:scale-[0.98] transition-transform text-left border border-slate-100/50 hover:bg-slate-50"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">在线申请开具发票</h3>
                <p className="text-xs text-slate-500 mt-1">发票将在 48H 内发送至您的邮箱</p>
              </div>
            </button>

            {/* Service Report Detailed Card */}
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100/50">
              <div className="flex justify-between items-center px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">服务报告详情</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">工单: {selectedOrder.id}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-100">
                <button 
                  onClick={() => { setIsAfterSalesOpen(false); /* let parent page remain on detail */ }}
                  className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-800"
                >
                  <FileText className="w-4 h-4 text-slate-500" /> 查看
                </button>
                <button 
                  onClick={() => toast.success('正在准备下载 PDF...')}
                  className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 transition-colors text-sm font-semibold text-indigo-600"
                >
                  <Download className="w-4 h-4" /> 下载 PDF
                </button>
              </div>
            </div>

            {/* Complaints & Suggestions Card */}
            <button 
              onClick={() => {
                setIsAfterSalesOpen(false);
                setIsFeedbackModalOpen(true);
              }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm active:scale-[0.98] transition-transform text-left border border-slate-100/50 hover:bg-slate-50"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500 rounded-full shrink-0">
                <MessageSquareWarning className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">投诉与建议</h3>
                <p className="text-xs text-slate-500 mt-1">告诉我们您的不满与建议</p>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  };

  const ReopenTicketModal = () => {
    const [reason, setReason] = useState('');
    
    // We only reset state when opening to avoid clearing while tearing down
    useEffect(() => {
        if(isReopenTicketOpen) {
            setReason('');
        }
    }, [isReopenTicketOpen]);

    if (!isReopenTicketOpen || !selectedOrder) return null;

    const handleSubmit = () => {
        if (!reason.trim()) {
            toast.error('请填写重启原因');
            return;
        }
        const updated = {
            ...selectedOrder,
            status: OrderStatus.RESTARTED,
            timeline: [...selectedOrder.timeline, { title: '工单重新派发', description: `重启原因: ${reason}`, timestamp: new Date().toISOString(), isActive: true }]
        };
        setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
        setSelectedOrder(updated);
        setIsReopenTicketOpen(false);
        toast.success("已成功重新开启工单并派单至服务台");
    };

    return (
        <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg text-slate-800">申请重新开启工单</h3>
                   <button onClick={() => setIsReopenTicketOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full active:scale-95 transition-all">
                       <X size={18} />
                   </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">请说明设备未解决或复发的详细情况，我们将立刻为您重新派发工程师处理。</p>
                
                <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例如: 设备仍然无法开机，或者使用一段时间后再次报错..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 resize-none outline-none text-slate-800 mb-6" 
                    rows={4}
                />
                
                <div className="flex gap-3 mt-auto">
                   <Button variant="secondary" fullWidth onClick={() => setIsReopenTicketOpen(false)}>取消</Button>
                   <Button fullWidth onClick={handleSubmit}>确认重新派单</Button>
                </div>
            </div>
        </div>
    );
  };

  const InvoiceModal = () => {
    const [invoiceType, setInvoiceType] = useState('company');
    const [title, setTitle] = useState('');
    const [taxId, setTaxId] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if(isInvoiceModalOpen) {
            setInvoiceType('company');
            setTitle('');
            setTaxId('');
            setEmail('');
        }
    }, [isInvoiceModalOpen]);

    if (!isInvoiceModalOpen || !selectedOrder) return null;

    const handleSubmit = () => {
        if (!title.trim() || !email.trim()) {
            toast.error('请填写完整的发票及接收邮箱信息');
            return;
        }
        if (invoiceType === 'company' && !taxId.trim()) {
            toast.error('请填写企业税号');
            return;
        }
        setIsInvoiceModalOpen(false);
        toast.success("发票申请已接收，工作日48小时内发送至您的邮箱");
    };

    return (
        <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar pb-10">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Receipt size={20} className="text-indigo-600"/> 申请开具发票</h3>
                   <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full active:scale-95 transition-all">
                       <X size={18} />
                   </button>
                </div>

                <div className="flex flex-col gap-6">
                    {/* 工单金额提示 */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-indigo-800">可开票金额</span>
                        <span className="text-xl font-bold font-mono text-indigo-700">¥ {selectedOrder.cost || 0}</span>
                    </div>

                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        <button 
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${invoiceType === 'company' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setInvoiceType('company')}
                        >
                            企业单位
                        </button>
                        <button 
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${invoiceType === 'personal' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setInvoiceType('personal')}
                        >
                            个人/非企业
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">{invoiceType === 'company' ? '企业抬头' : '发票抬头'}</label>
                            <input 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={invoiceType === 'company' ? "请输入单位名称" : "请输入姓名"} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800"
                            />
                        </div>

                        {invoiceType === 'company' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">纳税人识别号</label>
                                <input 
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    placeholder="请输入15-20位企业税号" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800 font-mono"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">接收邮箱</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="电子发票将发送至此邮箱" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="mt-8">
                   <Button fullWidth onClick={handleSubmit}>确认提交</Button>
                </div>
            </div>
        </div>
    );
  };

  const FeedbackModal = () => {
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if(isFeedbackModalOpen) {
            setFeedback('');
        }
    }, [isFeedbackModalOpen]);

    if (!isFeedbackModalOpen || !selectedOrder) return null;

    const handleSubmit = () => {
        if (!feedback.trim()) {
            toast.error('请填写反馈内容');
            return;
        }
        setIsFeedbackModalOpen(false);
        toast.success("感谢您的反馈");
    };

    return (
        <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-amber-500" /> 投诉与建议</h3>
                   <button onClick={() => setIsFeedbackModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full active:scale-95 transition-all">
                       <X size={18} />
                   </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">如果您对我们的服务有任何不满或更好的建议，请随时告诉我们。</p>
                
                <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="请详细描述您的问题或建议..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400 resize-none outline-none text-slate-800 mb-6" 
                    rows={5}
                />
                
                <div className="flex gap-3 mt-auto">
                   <Button variant="secondary" fullWidth onClick={() => setIsFeedbackModalOpen(false)}>取消</Button>
                   <Button fullWidth onClick={handleSubmit}>提交反馈</Button>
                </div>
            </div>
        </div>
    );
  };

  const AcceptanceModal = () => {
      if (!isAcceptanceOpen || !selectedOrder) return null;
      const report = selectedOrder.repairReport;

      return (
         <div className="absolute inset-0 z-[60] bg-white overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300 flex flex-col transform-gpu">
             <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-10 bg-white">
                <button onClick={() => setIsAcceptanceOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
                  <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h3 className="font-bold text-lg text-slate-800">确认验收</h3>
                <div className="w-10" />
             </div>
             
             <div className="p-5 flex-1 flex flex-col">
               {/* Repair Report Section */}
               <div className="mb-6 space-y-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                   <FileText size={18} />
                   <h4 className="font-bold">工程师维修报告</h4>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                   <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">解决方式</p>
                      <p className="text-sm text-slate-700 font-semibold">{report?.solutionMethod || '常规维修'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">解决方案描述</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{report?.solutionDescription || '已完成相关维修工作。'}</p>
                   </div>
                   
                   {report?.mediaUrls && report.mediaUrls.length > 0 && (
                      <div>
                         <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">维修照片/视频</p>
                         <div className="grid grid-cols-3 gap-2">
                            {report.mediaUrls.map((url, idx) => (
                               <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer">
                                  <img src={url} alt={`维修图 ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <Play size={16} className="text-white fill-white" />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>

                {/* Cost Breakdown Card */}
                <div className="flex items-center gap-2 text-orange-600 mb-2 pt-2">
                   <CreditCard size={18} />
                   <h4 className="font-bold">维修费用明细</h4>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">上门费</span>
                      <span className="text-sm font-medium text-slate-700">¥{(selectedOrder.costBreakdown?.callOutFee || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">工时费</span>
                      <span className="text-sm font-medium text-slate-700">¥{(selectedOrder.costBreakdown?.laborFee || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">配件/资源费</span>
                      <span className="text-sm font-medium text-slate-700">¥{(selectedOrder.costBreakdown?.partsFee || 0).toFixed(2)}</span>
                   </div>
                   <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">合计费用</span>
                      <span className="text-lg font-bold text-orange-600">¥{(selectedOrder.cost || 0).toFixed(2)}</span>
                   </div>
                </div>
             </div>

             <div className="bg-orange-50 rounded-2xl p-4 mb-6 border border-orange-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
                     <CheckCircle size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">确认维修已完成？</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                     验收通过后，工单将进入支付状态，请确保设备已恢复正常运行
                  </p>
             </div>

             <div className="space-y-3 mt-auto pt-6 pb-4">
                <Button fullWidth className="bg-orange-600 hover:bg-orange-700 h-14 rounded-2xl font-bold text-base shadow-lg shadow-orange-100" onClick={handleAcceptance}>验收并签字</Button>
             </div>
           </div>
        </div>
     );
  };

  const SubmitPaymentModal = () => {
    if (!isSubmitPaymentOpen || !pendingOrder) return null;

    const handlePaymentSuccess = () => {
      setOrders([pendingOrder, ...orders]);
      setIsSubmitPaymentOpen(false);
      setPendingOrder(null);
      setActiveTab('orders');
      setFilterStatus('全部');
      setFilterDate('3m');
      toast.success('支付成功，工单已提交！');
    };

    return (
      <div className="absolute inset-0 z-[200] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSubmitPaymentOpen(false)} />
        <Card className="w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">支付维修定金</h3>
            <button onClick={() => setIsSubmitPaymentOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-slate-500 mb-2">需支付金额</div>
              <div className="text-4xl font-bold text-slate-900">¥{pendingOrder.cost || 50}</div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">报修设备</span>
                <span className="font-medium text-slate-800">{pendingOrder.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">故障描述</span>
                <span className="font-medium text-slate-800 truncate max-w-[150px]">{pendingOrder.description}</span>
              </div>
            </div>

            <Button 
              className="w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-100"
              onClick={handlePaymentSuccess}
            >
              确认支付
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const PaymentModal = () => {
     if (!isPaymentOpen || !selectedOrder) return null;
     return (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">支付详情</h3>
                  <button onClick={() => setIsPaymentOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               
               <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 flex flex-col items-center">
                   <p className="text-sm text-slate-500 mb-1">支付金额</p>
                   <h1 className="text-4xl font-bold text-slate-800 mb-4">¥{selectedOrder.cost?.toFixed(2)}</h1>
                   
                   <div className="w-full h-px bg-slate-200 mb-4"></div>
                   
                   <div className="w-full space-y-2">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">工单号</span>
                         <span className="font-mono text-slate-700">{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">服务项目</span>
                         <span className="text-slate-700 font-medium truncate max-w-[150px]">{selectedOrder.title}</span>
                      </div>
                   </div>
               </div>

               <div className="space-y-3 mb-6">
                  <button 
                    onClick={() => setPaymentMethod('points')}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${paymentMethod === 'points' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white"><Sparkles size={18}/></div>
                        <div className="text-left">
                           <p className="font-bold text-slate-800">积分支付</p>
                           <p className="text-[10px] text-slate-400">可用积分: 12,450</p>
                        </div>
                     </div>
                     {paymentMethod === 'points' && <CheckCircle size={20} className="text-indigo-600" />}
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('wechat')}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${paymentMethod === 'wechat' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white"><Wallet size={18}/></div>
                        <span className="font-bold text-slate-800">微信支付</span>
                     </div>
                     {paymentMethod === 'wechat' && <CheckCircle size={20} className="text-indigo-600" />}
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('credit')}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${paymentMethod === 'credit' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white"><CreditCard size={18}/></div>
                        <span className="font-bold text-slate-800">信用卡</span>
                     </div>
                     {paymentMethod === 'credit' && <CheckCircle size={20} className="text-indigo-600" />}
                  </button>
               </div>

               <Button fullWidth onClick={handlePayment}>立即支付</Button>
            </div>
        </div>
     );
  };

  const HurryUpModal = () => {
    if (!isHurryUpOpen || !hurryUpTargetOrder) return null;
    return (
      <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800">催促接单</h3>
            <button onClick={() => setIsHurryUpOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400"/>
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mb-4">
            工单号: <span className="font-mono text-slate-700">{hurryUpTargetOrder.id}</span>
          </p>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">催单内容</label>
            <textarea 
              value={hurryUpContent}
              onChange={(e) => setHurryUpContent(e.target.value)}
              placeholder="请输入您的催单要求，例如：希望能尽快处理..."
              className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setIsHurryUpOpen(false)}>取消</Button>
            <Button fullWidth onClick={() => {
              setIsHurryUpOpen(false);
              setHurryUpContent("");
            }}>确认</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderLogin = () => {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        {/* Phone Frame Mockup */}
        <div className="w-full max-w-[400px] h-[850px] bg-white rounded-[3rem] shadow-2xl border-[10px] border-slate-900 overflow-hidden relative flex flex-col">
          {/* Status Bar */}
          <div className="h-8 w-full flex justify-between items-center px-8 pt-4 shrink-0">
            <span className="text-xs font-bold text-slate-900">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-4 h-2 bg-slate-900/20 rounded-sm" />
              <div className="w-3 h-3 bg-slate-900/20 rounded-full" />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col pt-12">
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
                <Bot size={32} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">欢迎登录</h1>
              <p className="text-slate-500">智能报修系统，让维修更简单</p>
            </div>

            <Card className="p-8 shadow-xl border-slate-100 mb-8">
              {loginMode === 'password' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">账号</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="请输入手机号或邮箱"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">密码</label>
                      <button onClick={() => {
                        setLoginMode('forgot');
                        setIsForgotPhoneVerified(false);
                        setForgotPhone('');
                      }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4">忘记密码？</button>
                    </div>
                    <div className="relative">
                      <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="请输入密码"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="agree-password"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="agree-password" className="text-xs text-slate-500 leading-relaxed">
                      我已阅读并同意
                      <button onClick={() => setIsAgreementModalOpen(true)} className="text-indigo-600 font-bold hover:underline mx-0.5">《用户服务协议》</button>
                      和
                      <button onClick={() => setIsPrivacyModalOpen(true)} className="text-indigo-600 font-bold hover:underline mx-0.5">《隐私政策》</button>
                    </label>
                  </div>
                  <Button 
                    fullWidth 
                    size="lg" 
                    className="mt-6" 
                    onClick={() => {
                      if (!isAgreed) {
                        toast.error("请先阅读并同意用户协议和隐私政策");
                        return;
                      }
                      setIsAuthenticated(true);
                      setActiveTab('home');
                    }}
                  >
                    登录
                  </Button>
                  
                  <div className="mt-4 flex justify-center">
                    <button 
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                      onClick={() => {
                        if (!isAgreed) {
                          toast.error("请先阅读并同意用户协议和隐私政策");
                          return;
                        }
                        setIsAuthenticated(true);
                        setActiveTab('home');
                      }}
                    >
                      <Fingerprint size={18} className="text-indigo-600" />
                      <span className="text-sm font-medium text-slate-600">本机号码一键登录</span>
                    </button>
                  </div>
                </div>
              )}

              {loginMode === 'register' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">用户注册</h2>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用户名称</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入用户名称"
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用户地址</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入用户地址"
                      value={regStoreAddress}
                      onChange={(e) => setRegStoreAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">联系人姓名</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入联系人姓名"
                      value={regContactName}
                      onChange={(e) => setRegContactName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">联系电话</label>
                    <input 
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入联系电话"
                      value={regContactPhone}
                      onChange={(e) => setRegContactPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">验证码</label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="请输入验证码"
                        value={regSmsCode}
                        onChange={(e) => setRegSmsCode(e.target.value)}
                      />
                      <button 
                        onClick={() => toast.success("验证码已发送至您的手机")}
                        className="px-4 py-3 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-2xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
                      >
                        获取验证码
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">设置密码</label>
                    <input 
                      type="password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入密码"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">确认密码</label>
                    <input 
                      type="password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请再次输入密码"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-start gap-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="agree-register"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="agree-register" className="text-xs text-slate-500 leading-relaxed">
                      我已阅读并同意
                      <button onClick={() => setIsAgreementModalOpen(true)} className="text-indigo-600 font-bold hover:underline mx-0.5">《用户服务协议》</button>
                      和
                      <button onClick={() => setIsPrivacyModalOpen(true)} className="text-indigo-600 font-bold hover:underline mx-0.5">《隐私政策》</button>
                    </label>
                  </div>

                  <Button 
                    fullWidth 
                    size="lg" 
                    className="mt-6" 
                    onClick={() => {
                      if (!isAgreed) {
                        toast.error("请先阅读并同意用户协议和隐私政策");
                        return;
                      }
                      if (!regStoreName || !regStoreAddress || !regContactName || !regContactPhone || !regSmsCode || !regPassword || !regConfirmPassword) {
                        toast.error("请完善所有注册信息");
                        return;
                      }
                      if (regPassword !== regConfirmPassword) {
                        toast.error("两次输入的密码不一致");
                        return;
                      }
                      
                      // Update user info with registered data
                      setUserName(regContactName);
                      setUserPhone(regContactPhone);
                      setUserAddress(regStoreAddress);
                      
                      setLoginMode('password');
                      toast.success("注册成功，请登录");
                    }}
                  >
                    立即注册
                  </Button>
                  <button onClick={() => setLoginMode('password')} className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600 mt-4">
                    已有账号？立即登录
                  </button>
                </div>
              )}

              {loginMode === 'forgot' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">找回密码</h2>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">手机号</label>
                    <input 
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="请输入手机号"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      disabled={isForgotPhoneVerified}
                    />
                  </div>
                  {!isForgotPhoneVerified ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">验证码</label>
                        <div className="flex gap-3">
                          <input 
                            type="text"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="请输入验证码"
                          />
                          <button 
                            onClick={() => {
                              const normalizedPhone = forgotPhone.replace(/-/g, '');
                              const registeredPhone = userPhone.replace(/-/g, '');
                              if (normalizedPhone === registeredPhone) {
                                toast.success("验证码已发送至您的手机");
                              } else {
                                setIsForgotErrorModalOpen(true);
                              }
                            }}
                            className="px-4 py-3 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-2xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
                          >
                            获取验证码
                          </button>
                        </div>
                      </div>
                      <Button 
                        fullWidth 
                        size="lg" 
                        className="mt-6" 
                        onClick={() => {
                          const normalizedPhone = forgotPhone.replace(/-/g, '');
                          const registeredPhone = userPhone.replace(/-/g, '');
                          if (normalizedPhone === registeredPhone) {
                            setIsForgotPhoneVerified(true);
                            toast.success("验证成功，请设置新密码");
                          } else {
                            setIsForgotErrorModalOpen(true);
                          }
                        }}
                      >
                        下一步
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">新密码</label>
                        <input 
                          type="password"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="请输入新密码"
                        />
                      </div>
                      <Button 
                        fullWidth 
                        size="lg" 
                        className="mt-6" 
                        onClick={() => {
                          toast.success("密码重置成功，请重新登录");
                          setLoginMode('password');
                          setIsForgotPhoneVerified(false);
                          setForgotPhone('');
                        }}
                      >
                        重置密码
                      </Button>
                    </div>
                  )}
                  <button onClick={() => {
                    setLoginMode('password');
                    setIsForgotPhoneVerified(false);
                    setForgotPhone('');
                  }} className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600 mt-4">
                    返回登录
                  </button>
                </div>
              )}

              {loginMode !== 'register' && loginMode !== 'forgot' && (
                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                  <p className="text-sm text-slate-500">
                    还没有账号？ 
                    <button onClick={() => setLoginMode('register')} className="ml-1 font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4">立即注册</button>
                  </p>
                </div>
              )}
            </Card>
            
          </div>

          {/* Home Indicator */}
          <div className="h-1.5 w-32 bg-slate-200 rounded-full mx-auto mb-3 shrink-0" />
        </div>

        {/* Forgot Password Error Modal */}
        {isForgotErrorModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsForgotErrorModalOpen(false)} />
            <Card className="w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">验证失败</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  对不起，您的手机号未注册过本系统，可直接申请注册
                </p>
                <div className="flex flex-col w-full gap-3">
                  <Button 
                    fullWidth 
                    onClick={() => {
                      setIsForgotErrorModalOpen(false);
                      setLoginMode('register');
                    }}
                  >
                    立即注册
                  </Button>
                  <button 
                    onClick={() => setIsForgotErrorModalOpen(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2"
                  >
                    取消
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* User Service Agreement Modal */}
        {isAgreementModalOpen && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAgreementModalOpen(false)} />
            <Card className="w-full max-w-sm relative z-10 p-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800">用户服务协议</h3>
                <button onClick={() => setIsAgreementModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-slate-600 space-y-4 leading-relaxed">
                <p className="font-bold text-slate-800">1. 协议确认</p>
                <p>欢迎使用 SmartFix 智能维修平台。在您注册并使用本服务前，请务必审慎阅读、充分理解各条款内容。</p>
                <p className="font-bold text-slate-800">2. 服务内容</p>
                <p>本平台为您提供智能报修、工单追踪、费用统计等相关服务。我们致力于为您提供高效、便捷的维修体验。</p>
                <p className="font-bold text-slate-800">3. 用户义务</p>
                <p>用户应保证提供的信息真实、准确。不得利用本平台从事任何违法违规活动。</p>
                <p className="font-bold text-slate-800">4. 知识产权</p>
                <p>本平台及其关联的所有内容（包括但不限于文字、图片、音频、视频、软件等）的知识产权均归本公司所有。</p>
                <p>（此处省略更多详细条款内容...）</p>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <Button fullWidth onClick={() => {
                  setIsAgreed(true);
                  setIsAgreementModalOpen(false);
                }}>我已阅读并同意</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {isPrivacyModalOpen && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPrivacyModalOpen(false)} />
            <Card className="w-full max-w-sm relative z-10 p-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800">隐私政策</h3>
                <button onClick={() => setIsPrivacyModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-slate-600 space-y-4 leading-relaxed">
                <p className="font-bold text-slate-800">1. 信息收集</p>
                <p>我们收集您的手机号、位置信息、报修图片及语音等，仅用于为您提供维修服务及优化用户体验。</p>
                <p className="font-bold text-slate-800">2. 信息使用</p>
                <p>我们承诺不会将您的个人信息出售给任何第三方。所有信息的使用均符合相关法律法规要求。</p>
                <p className="font-bold text-slate-800">3. 信息保护</p>
                <p>我们采用行业领先的安全技术和加密手段，确保您的数据安全。防止未经授权的访问、泄露或篡改。</p>
                <p className="font-bold text-slate-800">4. 您的权利</p>
                <p>您有权访问、更正、删除您的个人信息。您也可以随时撤回您的授权同意。</p>
                <p>（此处省略更多详细隐私政策内容...）</p>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <Button fullWidth onClick={() => {
                  setIsAgreed(true);
                  setIsPrivacyModalOpen(false);
                }}>我已阅读并同意</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Complete Profile Modal */}
        {isCompleteProfileOpen && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCompleteProfileOpen(false)} />
            <Card className="w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-bold text-slate-800">完善档案</h3>
                  <p className="text-xs text-slate-500 mt-1">创建用户需完善档案</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用户名称</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="请输入用户名称"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用户地址</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="请输入用户地址"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">联系人姓名</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="请输入联系人姓名"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">联系电话</label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="请输入联系电话"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>

                <Button 
                  fullWidth 
                  size="lg" 
                  className="mt-4" 
                  onClick={() => {
                    if (!storeName || !storeAddress || !contactName || !contactPhone) {
                      toast.error("请完善所有档案信息");
                      return;
                    }
                    setUserName(contactName);
                    setUserPhone(contactPhone);
                    setUserAddress(storeAddress);
                    setIsCompleteProfileOpen(false);
                    setIsAuthenticated(true);
                    setActiveTab('home');
                    toast.success("注册并登录成功");
                  }}
                >
                  确认提交
                </Button>
                <button 
                  onClick={() => setIsCompleteProfileOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2"
                >
                  取消
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="bg-slate-50 min-h-full pb-24">
        {/* Header */}
        <div className="px-6 py-4 flex justify-center items-center bg-white border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">个人中心</h2>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Card */}
          <Card className="flex flex-col items-center py-8 shadow-sm">
            <div className="relative mb-4">
              <div 
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-lg bg-slate-100 cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img src={userAvatar} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
              <button 
                className="absolute right-0 bottom-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera size={14} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">{userName}</h3>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              userType === 'individual' 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}>
              {userType === 'individual' ? <User size={12} /> : <Building2 size={12} />}
              {userType === 'individual' ? '个人用户' : '企业用户'}
            </div>
          </Card>

          {/* Settings Section */}
          <div className="space-y-3">
            <div className="px-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">账号设置</h4>
            </div>
            
            <Card className="p-2 space-y-1 shadow-sm">
              <button 
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                onClick={() => setIsAccountSecurityOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Shield size={20} />
                  </div>
                  <span className="font-bold text-slate-700">账号安全</span>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>

              <button 
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                onClick={() => setIsPointsManagementOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                    <Coins size={20} />
                  </div>
                  <span className="font-bold text-slate-700">积分管理</span>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>

              <button 
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                onClick={() => setIsEnterpriseModalOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <Building size={20} />
                  </div>
                  <span className="font-bold text-slate-700">企业认证</span>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const EnterpriseCertificationModal = () => {
    if (!isEnterpriseModalOpen) return null;

    const handleLinkSubmit = () => {
      if (!linkForm.code || !linkForm.storeId || !linkForm.contact) {
        toast.error("请完善所有信息");
        return;
      }
      // Mock validation
      if (linkForm.code === 'ERROR') {
        toast.error("信息有误，无法关联");
      } else {
        setUserType('corporate');
        setIsEnterpriseModalOpen(false);
        setEnterpriseFlow(null);
        toast.success("成功关联企业");
      }
    };

    const handleCreateSubmit = () => {
      if (!createForm.name || !createForm.contactName || !createForm.phone || !createForm.address || !createForm.taxId || !createForm.bankName || !createForm.bankAccount || !createForm.businessLicense) {
        toast.error("请完善所有信息");
        return;
      }
      setIsEnterpriseModalOpen(false);
      setEnterpriseFlow(null);
      toast.success("申请已提交，请等待审核");
    };

    if (enterpriseFlow) {
      return (
        <div className="absolute inset-0 z-[100] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
          <div className="bg-white w-full flex flex-col min-h-full">
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-10">
              <button onClick={() => setEnterpriseFlow(null)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">
                {enterpriseFlow === 'link' ? '关联已有企业' : '申请企业账号'}
              </h3>
              <div className="w-10" />
            </div>
            
            <div className="p-5 space-y-4">
              {enterpriseFlow === 'link' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">企业代码/企业名称</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入企业代码或企业名称"
                      value={linkForm.code}
                      onChange={(e) => setLinkForm({...linkForm, code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">门店ID</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入门店ID"
                      value={linkForm.storeId}
                      onChange={(e) => setLinkForm({...linkForm, storeId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">工号/联系电话</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入工号或联系电话"
                      value={linkForm.contact}
                      onChange={(e) => setLinkForm({...linkForm, contact: e.target.value})}
                    />
                  </div>
                  <Button fullWidth size="lg" className="mt-4" onClick={handleLinkSubmit}>确认加入</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">企业名称</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入企业名称"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">姓名</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入您的姓名"
                      value={createForm.contactName}
                      onChange={(e) => setCreateForm({...createForm, contactName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">电话</label>
                    <input 
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入联系电话"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">地址</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入企业地址"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">纳税登记号</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入纳税登记号"
                      value={createForm.taxId}
                      onChange={(e) => setCreateForm({...createForm, taxId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">开户行</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入开户行"
                      value={createForm.bankName}
                      onChange={(e) => setCreateForm({...createForm, bankName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">银行账号</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="请输入银行账号"
                      value={createForm.bankAccount}
                      onChange={(e) => setCreateForm({...createForm, bankAccount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">营业执照照片</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-2xl hover:border-indigo-400 transition-colors bg-slate-50">
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-8 w-8 text-slate-400" />
                        <div className="flex text-sm text-slate-600 justify-center mt-2">
                          <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                            <span>上传照片</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setCreateForm({...createForm, businessLicense: URL.createObjectURL(e.target.files[0])});
                              }
                            }} />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF 最大 10MB</p>
                      </div>
                    </div>
                    {createForm.businessLicense && (
                      <div className="mt-2 relative rounded-2xl overflow-hidden border border-slate-200">
                        <img src={createForm.businessLicense} alt="营业执照" className="w-full h-40 object-cover" />
                        <button 
                          onClick={() => setCreateForm({...createForm, businessLicense: ''})}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <Button fullWidth size="lg" className="mt-6" onClick={handleCreateSubmit}>提交申请</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEnterpriseModalOpen(false)} />
        <div className="bg-white w-full max-w-[360px] rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">企业认证</h3>
              <button onClick={() => setIsEnterpriseModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setEnterpriseFlow('link')}
                className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <LinkIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">关联已有企业</p>
                    <p className="text-[10px] text-slate-500">通过企业代码/名称和门店ID快速加入</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
              </button>

              <button 
                onClick={() => setEnterpriseFlow('create')}
                className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <Building2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">申请企业账号</p>
                    <p className="text-[10px] text-slate-500">创建新的企业管理账号</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LogoutConfirmModal = () => {
    if (!isLogoutModalOpen) return null;

    return (
      <div className="absolute inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <LogOut size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">确认登出</h3>
              <p className="text-slate-500 text-sm">您确定要退出当前账号吗？</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setIsLogoutModalOpen(false)}>取消</Button>
              <Button 
                fullWidth 
                className="bg-rose-600 hover:bg-rose-700 text-white border-none"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  setIsAuthenticated(false);
                  setIsAccountSecurityOpen(false);
                  setLoginMode('password');
                }}
              >
                确认登出
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AccountSecurityModal = () => {
    if (!isAccountSecurityOpen) return null;

    const maskPhone = (phone: string) => {
      if (!phone) return '';
      const clean = phone.replace(/-/g, '');
      return clean.slice(0, 3) + '******' + clean.slice(-2);
    };

    return (
      <div className="absolute inset-0 z-[60] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
        <div className="bg-white w-full flex flex-col min-h-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button onClick={() => setIsAccountSecurityOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">账号与安全</h3>
            <div className="w-10" /> {/* Spacer */}
          </div>
          
          <div className="p-4 space-y-4">
          {/* Group 1: Identity */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setIsChangePhoneOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50"
            >
              <span className="text-[15px] font-medium text-slate-700">手机号</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-slate-400">{maskPhone(userPhone)}</span>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </button>

            <button 
              onClick={() => setIsChangeEmailOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-slate-700">邮箱</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-slate-400">{userEmail || '待添加'}</span>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </button>
          </div>

          {/* Group 2: Password */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-slate-700">登录密码</span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Group 3: Other Accounts */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setIsOtherAccountsOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="text-[15px] font-medium text-slate-700">名下其他账号</span>
                <span className="text-[11px] text-slate-400 mt-0.5">查看同身份已认证账号</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Group 4: Delete Account */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setIsDeleteAccountOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="text-[15px] font-medium text-slate-700">账号注销</span>
                <span className="text-[11px] text-slate-400 mt-0.5">删除账号所有数据，注销后不可恢复</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Group 5: Logout */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors group"
            >
              <span className="text-[15px] font-medium text-rose-600">退出账号</span>
              <ChevronRight size={18} className="text-rose-300 group-hover:text-rose-400 transition-colors" />
            </button>
          </div>

          {/* Footer Links */}
          <div className="pt-8 pb-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-slate-400">
              <button 
                onClick={() => setIsAgreementModalOpen(true)}
                className="text-indigo-600 font-medium hover:underline"
              >
                《用户服务协议》
              </button>
            </div>
            <button 
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-indigo-600 font-medium text-[13px] hover:underline"
            >
              《隐私政策》
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const ChangeEmailModal = () => {
    const [newEmail, setNewEmail] = useState('');
    const [code, setCode] = useState('');
    if (!isChangeEmailOpen) return null;

    return (
      <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsChangeEmailOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">{userEmail ? '更换邮箱' : '绑定邮箱'}</h3>
            <button onClick={() => setIsChangeEmailOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">邮箱地址</label>
              <input 
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入邮箱地址"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">验证码</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="请输入验证码"
                />
                <button className="px-4 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-colors text-sm whitespace-nowrap">
                  获取验证码
                </button>
              </div>
            </div>
          </div>

          <Button 
            className="w-full py-4 rounded-2xl text-lg font-bold"
            onClick={() => {
              if (newEmail.includes('@')) {
                setUserEmail(newEmail);
                toast.success('邮箱绑定成功');
                setIsChangeEmailOpen(false);
              } else {
                toast.error('请输入正确的邮箱地址');
              }
            }}
          >
            确认提交
          </Button>
        </div>
      </div>
    );
  };

  const ChangePhoneModal = () => {
    const [newPhone, setNewPhone] = useState('');
    const [code, setCode] = useState('');
    if (!isChangePhoneOpen) return null;

    return (
      <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsChangePhoneOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">更换手机号</h3>
            <button onClick={() => setIsChangePhoneOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">新手机号</label>
              <input 
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入新手机号"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">验证码</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="请输入验证码"
                />
                <button className="px-4 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-colors text-sm whitespace-nowrap">
                  获取验证码
                </button>
              </div>
            </div>
          </div>

          <Button 
            className="w-full py-4 rounded-2xl text-lg font-bold"
            onClick={() => {
              if (newPhone.length === 11) {
                setUserPhone(newPhone);
                toast.success('手机号更换成功');
                setIsChangePhoneOpen(false);
              } else {
                toast.error('请输入正确的手机号');
              }
            }}
          >
            确认更换
          </Button>
        </div>
      </div>
    );
  };

  const WithdrawModal = () => {
    if (!isWithdrawModalOpen) return null;

    const handleWithdraw = () => {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('请输入有效的提现金额');
        return;
      }
      if (amount > userPoints) {
        toast.error('提现金额不能超过可用积分');
        return;
      }

      setUserPoints(prev => prev - amount);
      toast.success(`提现申请已提交，¥${amount.toFixed(2)} 将原路退回到您的充值账户`);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
    };

    return (
      <div className="absolute inset-0 z-[200] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsWithdrawModalOpen(false)} />
        <Card className="w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">积分提现</h3>
            <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-orange-600 font-medium">提现说明</span>
                <span className="text-xs text-orange-400">原路退回</span>
              </div>
              <p className="text-xs text-orange-400">提现金额将原路退回到您的充值端（微信/支付宝/银行卡）</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-slate-700">提现金额</label>
                <span className="text-xs text-slate-400">可用积分: {userPoints.toFixed(2)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                <input 
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="请输入提现金额"
                  className="w-full pl-8 pr-16 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                />
                <button 
                  onClick={() => setWithdrawAmount(userPoints.toString())}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  全部提现
                </button>
              </div>
            </div>

            <Button 
              className="w-full py-4 rounded-2xl text-lg font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100"
              onClick={handleWithdraw}
            >
              确认提现
            </Button>
            
            <p className="text-[10px] text-slate-400 text-center">
              提现预计在 1-3 个工作日内到账
            </p>
          </div>
        </Card>
      </div>
    );
  };

  const RechargeModal = () => {
    if (!isRechargeModalOpen) return null;

    const quickAmounts = [50, 100, 150, 200];
    
    const getBonusText = (amount: number) => {
      if (amount === 50) return '可购买60积分';
      if (amount === 100) return '可购买125积分';
      if (amount === 150) return '可购买190积分';
      if (amount === 200) return '可购买260积分';
      return null;
    };

    const handleRecharge = () => {
      const amount = parseFloat(rechargeAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('请输入有效的充值金额');
        return;
      }
      
      if (!hasBankCard) {
        setIsAddBankCardOpen(true);
        return;
      }

      // Calculate points (1:1 + bonus)
      let pointsToAdd = amount;
      if (amount === 50) pointsToAdd = 60;
      else if (amount === 100) pointsToAdd = 125;
      else if (amount === 150) pointsToAdd = 190;
      else if (amount === 200) pointsToAdd = 260;

      setUserPoints(prev => prev + pointsToAdd);
      toast.success(`充值成功！获得 ${pointsToAdd} 积分`);
      setIsRechargeModalOpen(false);
    };

    return (
      <div className="absolute inset-0 z-[200] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRechargeModalOpen(false)} />
        <Card className="w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">积分充值</h3>
            <button onClick={() => setIsRechargeModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-blue-600 font-medium">兑换比例</span>
                <span className="text-xs text-blue-400">1元 = 1积分</span>
              </div>
              <p className="text-xs text-blue-400">充值金额越多，赠送积分越多</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map(amount => (
                <button 
                  key={amount}
                  onClick={() => setRechargeAmount(amount.toString())}
                  className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                    rechargeAmount === amount.toString() 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`font-bold text-lg ${rechargeAmount === amount.toString() ? 'text-blue-700' : 'text-slate-800'}`}>
                    ¥{amount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {getBonusText(amount)}
                  </div>
                  {rechargeAmount === amount.toString() && (
                    <div className="absolute top-0 right-0 p-1 bg-blue-600 text-white rounded-bl-lg">
                      <CheckCircle size={10} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">自定义金额</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                <input 
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="请输入充值金额"
                  className="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-800"
                />
              </div>
            </div>

            <Button 
              className="w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-100"
              onClick={handleRecharge}
            >
              立即充值
            </Button>
            
            <p className="text-[10px] text-slate-400 text-center">
              充值即代表您已阅读并同意《积分服务协议》
            </p>
          </div>
        </Card>
      </div>
    );
  };

  const AddBankCardModal = () => {
    if (!isAddBankCardOpen) return null;

    const banks = [
      { name: '招商银行', initial: 'M', color: 'bg-red-100 text-red-600' },
      { name: '中国农业银行', initial: 'A', color: 'bg-emerald-100 text-emerald-600' },
      { name: '中国民生银行', initial: 'S', color: 'bg-teal-100 text-teal-600' },
      { name: '中国工商银行', initial: 'I', color: 'bg-red-100 text-red-600' },
      { name: '中国建设银行', initial: 'C', color: 'bg-blue-100 text-blue-600' },
      { name: '中国邮政储蓄银行', initial: 'P', color: 'bg-green-100 text-green-600' },
      { name: '中国银行', initial: 'B', color: 'bg-red-100 text-red-600' },
    ];

    return (
      <div className="absolute inset-0 z-[210] bg-slate-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="bg-white w-full flex flex-col min-h-full">
          <div className="px-6 py-4 flex items-center border-b border-slate-100 shrink-0">
            <button onClick={() => setIsAddBankCardOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-800" />
            </button>
          </div>

          <div className="p-6 flex-1">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">添加银行卡</h2>
              <div className="flex items-center justify-center gap-1 text-blue-600 text-sm">
                <ShieldCheck size={16} />
                <span>系统全力保护你的信息安全</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-8 border border-slate-100">
              <input 
                type="text" 
                placeholder="输入银行名称或本人银行卡号" 
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm"
              />
              <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-3 text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
                <Camera size={20} className="mb-1" />
                <span className="text-[10px]">拍照添卡</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">免输卡号添加</h3>
              <div className="space-y-1">
                {banks.map((bank, idx) => (
                  <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${bank.color}`}>
                        {bank.initial}
                      </div>
                      <span className="text-slate-800 font-medium">{bank.name}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedBank(bank.name);
                        setIsFaceRecognitionOpen(true);
                      }}
                      className="text-blue-600 text-sm font-medium hover:text-blue-700 px-2 py-1"
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FaceRecognitionModal = () => {
    if (!isFaceRecognitionOpen) return null;

    const [scanStatus, setScanStatus] = useState<'scanning' | 'success'>('scanning');

    useEffect(() => {
      if (scanStatus === 'scanning') {
        const timer = setTimeout(() => {
          setScanStatus('success');
          setTimeout(() => {
            setHasBankCard(true);
            setIsFaceRecognitionOpen(false);
            setIsAddBankCardOpen(false);
            toast.success('银行卡添加成功！');
          }, 1500);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [scanStatus]);

    return (
      <div className="absolute inset-0 z-[220] bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="absolute top-6 left-6">
          <button onClick={() => setIsFaceRecognitionOpen(false)} className="p-2 bg-white/10 rounded-full text-white">
            <X size={24} />
          </button>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-12">人脸识别认证</h2>
        
        <div className="relative w-64 h-64 mb-12">
          {/* Scanning animation circle */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-700 overflow-hidden">
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <User size={80} className="text-slate-500" />
            </div>
            {scanStatus === 'scanning' && (
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-blue-500/30 animate-[pulse_2s_ease-in-out_infinite]" />
            )}
          </div>
          
          {/* Corner brackets */}
          <div className="absolute -inset-4 border-2 border-transparent border-t-blue-500 border-l-blue-500 w-12 h-12 rounded-tl-xl" />
          <div className="absolute -inset-4 border-2 border-transparent border-t-blue-500 border-r-blue-500 w-12 h-12 rounded-tr-xl right-0 left-auto" />
          <div className="absolute -inset-4 border-2 border-transparent border-b-blue-500 border-l-blue-500 w-12 h-12 rounded-bl-xl bottom-0 top-auto" />
          <div className="absolute -inset-4 border-2 border-transparent border-b-blue-500 border-r-blue-500 w-12 h-12 rounded-br-xl bottom-0 top-auto right-0 left-auto" />
          
          {scanStatus === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-full backdrop-blur-sm animate-in zoom-in">
              <CheckCircle size={64} className="text-emerald-500" />
            </div>
          )}
        </div>
        
        <p className="text-slate-300 text-center text-lg">
          {scanStatus === 'scanning' ? '请正对屏幕，保持面部在取景框内' : '认证成功'}
        </p>
      </div>
    );
  };

  const PointsManagementModal = () => {
    if (!isPointsManagementOpen) return null;

    const transactions = [
      { id: '1', type: 'recharge', title: '转账', amount: 503.24, time: '2026-01-07 09:18:16', balance: 621.42, icon: <Wallet className="text-orange-500" size={20} /> },
      { id: '2', type: 'expense', title: '维修服务支出', amount: -100.00, time: '2026-01-06 14:22:10', balance: 118.18, icon: <CreditCard className="text-slate-600" size={20} /> },
      { id: '3', type: 'recharge', title: '充值', amount: 19.92, time: '2026-01-05 10:05:45', balance: 218.18, icon: <Wallet className="text-orange-500" size={20} /> },
    ];

    return (
      <div className="absolute inset-0 z-[150] bg-slate-50 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
        <div className="bg-white w-full flex flex-col min-h-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button onClick={() => setIsPointsManagementOpen(false)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">积分管理</h3>
            <div className="w-10" />
          </div>

          <div className="p-4 space-y-4">
          {/* Balance Card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <span>可用积分</span>
              </div>
              <div className="text-5xl font-bold text-slate-900 tracking-tight">
                {userPoints.toFixed(2)}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="flex-1 py-4 px-6 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                提现
              </button>
              <button 
                onClick={() => setIsRechargeModalOpen(true)}
                className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                充值
              </button>
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-slate-50">
              <h4 className="font-bold text-slate-800">余额变动明细</h4>
              <button className="text-sm text-slate-400 flex items-center gap-1">
                全部 <ChevronRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {transactions.map(tx => (
                <div key={tx.id} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                    {tx.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-slate-800 truncate">{tx.title}</h5>
                      <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-orange-500' : 'text-slate-900'}`}>
                        {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>{tx.time}</span>
                      <span>余额 {tx.balance.toFixed(2)}元</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Customer Service */}
        <div className="p-6 bg-white border-t border-slate-50 flex justify-center">
          <button 
            onClick={() => {
              setIsPointsManagementOpen(false);
              setActiveTab('support');
            }}
            className="flex items-center gap-2 text-indigo-600 font-medium hover:opacity-80 transition-opacity"
          >
            <Bot size={20} />
            <span>我的客服</span>
          </button>
        </div>
      </div>
    </div>
    );
  };

  const OtherAccountsModal = () => {
    if (!isOtherAccountsOpen) return null;

    return (
      <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOtherAccountsOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">名下其他账号</h3>
            <button onClick={() => setIsOtherAccountsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6">
            {associatedAccounts.map(acc => (
              <div key={acc.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">{acc.name}</span>
                  <span className="text-xs text-slate-400">{acc.phone}</span>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">切换</button>
              </div>
            ))}
            <button 
              onClick={() => {
                if (userType === 'individual' && associatedAccounts.length >= 5) {
                  toast.error("个人账号最多关联5个账号，请升级企业账号");
                  return;
                }
                const newId = (associatedAccounts.length + 1).toString();
                setAssociatedAccounts([...associatedAccounts, { id: newId, name: `关联账号 ${newId}`, phone: '138****0000' }]);
                toast.success("添加关联账号成功");
              }}
              className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm font-medium hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              添加关联账号
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteAccountModal = () => {
    if (!isDeleteAccountOpen) return null;

    return (
      <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteAccountOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6 text-red-600">
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold">注销账号</h3>
            </div>
            <button onClick={() => setIsDeleteAccountOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4 mb-8">
            <p className="text-sm text-slate-600 leading-relaxed">
              注销账号是不可逆的操作，注销后：
            </p>
            <ul className="space-y-2">
              {[
                '个人资料将被永久删除',
                '所有历史订单记录将无法找回',
                '账户内的积分和优惠券将失效',
                '无法再使用该手机号登录'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteAccountOpen(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
            >
              再想想
            </button>
            <button 
              onClick={() => {
                toast.error('账号注销申请已提交，请等待审核');
                setIsDeleteAccountOpen(false);
                setIsAccountSecurityOpen(false);
              }}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors"
            >
              确认注销
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ChangePasswordModal = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    if (!isChangePasswordOpen) return null;

    return (
      <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsChangePasswordOpen(false)} />
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">修改密码</h3>
            <button onClick={() => setIsChangePasswordOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">当前密码</label>
              <input 
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入当前密码"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">新密码</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入新密码"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">确认新密码</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setIsChangePasswordOpen(false)}>取消</Button>
            <Button fullWidth onClick={() => {
              if (newPassword !== confirmPassword) {
                toast.error('两次输入的密码不一致');
                return;
              }
              toast.success('密码修改成功');
              setIsChangePasswordOpen(false);
            }}>确认修改</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCostReport = () => {
    const totalCost = orders.reduce((acc, order) => acc + (order.cost || 0), 0);
    const completedOrders = orders.filter(o => o.status === OrderStatus.CLOSED || o.status === OrderStatus.ARCHIVED);
    const totalCompletedCost = completedOrders.reduce((acc, order) => acc + (order.cost || 0), 0);

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-full">
        <header className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-slate-800">费用报表</h2>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <Calendar size={20} className="text-indigo-600" />
          </div>
        </header>

        {/* Balance Overview Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-xl shadow-indigo-100">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">可用积分</p>
                <div className="flex items-baseline gap-1">
                  <Sparkles size={24} className="text-amber-300 mr-1" />
                  <h1 className="text-4xl font-bold tracking-tight">{userPoints.toFixed(2)}</h1>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-indigo-100 text-[10px] uppercase tracking-wider mb-1">本月支出</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span className="font-bold">¥{chartData[chartData.length - 1].amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Expenditure Chart */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">支出趋势 (近半年)</h3>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span>支出金额</span>
              </div>
            </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  hide 
                  domain={[0, 'dataMax + 500']}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Detailed Breakdown */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">费用明细</h3>
              <button 
                onClick={handleExportReport}
                className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
              >
                导出报表 <FileText size={14} />
              </button>
            </div>
            
            {/* Cost Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit">
              {['全部', '已支付', '待支付'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCostFilter(filter)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                    costFilter === filter 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto no-scrollbar">
            {orders
              .filter(o => (o.cost || 0) > 0)
              .filter(o => {
                if (costFilter === '已支付') return o.status === OrderStatus.CLOSED || o.status === OrderStatus.ARCHIVED;
                if (costFilter === '待支付') return o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.ARCHIVED;
                return true;
              })
              .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
              .map(order => {
                const isPaid = order.status === OrderStatus.CLOSED || order.status === OrderStatus.ARCHIVED;
                return (
              <div key={order.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {isPaid ? <CheckCircle size={20} /> : <Clock size={20} />}
                   </div>
                   <div>
                      <p className="font-bold text-slate-800 text-sm">{order.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.id} • {formatDate(order.dateCreated)}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">¥{order.cost?.toFixed(2)}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isPaid ? '已结算' : '待支付'}
                  </p>
                </div>
              </div>
             );
            })}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      {!isAuthenticated ? renderLogin() : (
        <Layout 
          activeTab={activeTab} 
          onTabChange={(tab) => { 
            setActiveTab(tab); 
            setSelectedOrder(null); 
            setIsAccountSecurityOpen(false);
            setIsPointsManagementOpen(false);
            setIsManualOpen(false);
            setIsVoiceOpen(false);
            setIsCameraOpen(false);
            setIsNotificationsOpen(false);
            setIsEnterpriseModalOpen(false);
            setIsRechargeModalOpen(false);
            setIsAddBankCardOpen(false);
            setIsFaceRecognitionOpen(false);
            setIsWithdrawModalOpen(false);
            setIsChangePasswordOpen(false);
            setIsChangePhoneOpen(false);
            setIsChangeEmailOpen(false);
            setIsOtherAccountsOpen(false);
            setIsDeleteAccountOpen(false);
            setIsLocationPickerOpen(false);
            setIsAgreementModalOpen(false);
            setIsPrivacyModalOpen(false);
            setIsLogoutModalOpen(false);
            setIsCompleteProfileOpen(false);
            setIsEditRemarksOpen(false);
            setIsPaymentOpen(false);
            setIsSubmitPaymentOpen(false);
            setIsAcceptanceOpen(false);
            setIsAfterSalesOpen(false);
            setIsReopenTicketOpen(false);
            setIsInvoiceModalOpen(false);
            setIsFeedbackModalOpen(false);
            setIsSignatureOpen(false);
            setIsRatingOpen(false);
            setIsCancelModalOpen(false);
            setIsHurryUpOpen(false);
          }}
          onVoiceClick={() => setIsVoiceOpen(true)}
          modals={
            <>
              <LogoutConfirmModal />
              <QRScannerModal />
              <SmartRepairModal />
              <VoiceRepairModal />
              <ManualFormModal />
              <LocationPickerModal />
              <EditRemarksModal />
              <PaymentModal />
              <SubmitPaymentModal />
              <AcceptanceModal />
              <AfterSalesModal />
              <ReopenTicketModal />
              <InvoiceModal />
              <FeedbackModal />
              <SignatureModal />
              <CancelOrderModal />
              <RateServiceModal />
              {renderNotifications()}
              <HurryUpModal />
              <ChangePasswordModal />
              <WithdrawModal />
              <RechargeModal />
              <AddBankCardModal />
              <FaceRecognitionModal />
              <PointsManagementModal />
              <AccountSecurityModal />
              <ChangePhoneModal />
              <ChangeEmailModal />
              <OtherAccountsModal />
              <DeleteAccountModal />
              <EnterpriseCertificationModal />
            </>
          }
        >
          {activeTab === 'home' && renderHome()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'cost' && renderCostReport()}
          {activeTab === 'support' && renderSupport()}
          {activeTab === 'settings' && renderSettings()}
        </Layout>
      )}
    </>
  );
};

export default App;