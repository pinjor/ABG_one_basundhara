// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class LBn extends L {
  LBn([String locale = 'bn']) : super(locale);

  @override
  String get appName => 'ABG ONE';

  @override
  String get orgName => 'আনভীর বসুন্ধরা গ্রুপ';

  @override
  String get tagline => 'পুরো গ্রুপের জন্য একটি অ্যাপ।';

  @override
  String get splashLoading => 'আপনার সেশন সুরক্ষিত করা হচ্ছে';

  @override
  String get signIn => 'সাইন ইন';

  @override
  String get welcomeBack => 'আবার স্বাগতম';

  @override
  String get signInSubtitle =>
      'আপনার ABG ইমেইল বা কর্মী আইডি দিয়ে সাইন ইন করুন।';

  @override
  String get identifierLabel => 'ইমেইল বা কর্মী আইডি';

  @override
  String get passwordLabel => 'পাসওয়ার্ড';

  @override
  String get authenticatorLabel => 'অথেনটিকেটর কোড';

  @override
  String get carrierEntry => 'ABG অ্যাকাউন্ট ছাড়া পার্সেল বহন করছেন?';

  @override
  String get carrierEntryAction => 'বাহক সাইন-ইন';

  @override
  String get securedFooter => 'সুরক্ষিত প্রবেশ · প্রতিটি কাজ লগ করা হয়';

  @override
  String get guestTitle => 'বাহক সাইন-ইন';

  @override
  String get guestSubtitle =>
      'ডিসপ্যাচ আপনার জন্য যে মোবাইল নম্বর নিবন্ধন করেছে সেটি দিন। আমরা একটি ৬-সংখ্যার কোড পাঠাব।';

  @override
  String get phoneLabel => 'মোবাইল নম্বর';

  @override
  String get sendCode => 'কোড পাঠান';

  @override
  String get codeLabel => '৬-সংখ্যার কোড';

  @override
  String get verifyContinue => 'যাচাই করে এগিয়ে যান';

  @override
  String codeSentTo(Object phone) {
    return '$phone নম্বরে কোড পাঠানো হয়েছে';
  }

  @override
  String devCode(Object code) {
    return 'ডেভেলপমেন্ট কোড: $code';
  }

  @override
  String greetingMorning(Object name) {
    return 'শুভ সকাল, $name';
  }

  @override
  String greetingAfternoon(Object name) {
    return 'শুভ অপরাহ্ন, $name';
  }

  @override
  String greetingEvening(Object name) {
    return 'শুভ সন্ধ্যা, $name';
  }

  @override
  String get sendParcel => 'পার্সেল পাঠান';

  @override
  String get sendParcelHint =>
      'এক মিনিটের মধ্যে ডকুমেন্ট, যন্ত্র বা প্যাকেজ বুক করুন';

  @override
  String get myActivity => 'আমার কার্যক্রম';

  @override
  String get inTransit => 'পথে আছে';

  @override
  String get waitingForMe => 'আমার অপেক্ষায়';

  @override
  String get pendingPickup => 'পিকআপ বাকি';

  @override
  String get assignedToMe => 'আমাকে দেওয়া';

  @override
  String get actionRequired => 'পদক্ষেপ প্রয়োজন';

  @override
  String get recentParcels => 'সাম্প্রতিক পার্সেল';

  @override
  String get seeAll => 'সব দেখুন';

  @override
  String get navHome => 'হোম';

  @override
  String get navParcels => 'পার্সেল';

  @override
  String get navScan => 'স্ক্যান';

  @override
  String get navAlerts => 'নোটিফিকেশন';

  @override
  String get navProfile => 'প্রোফাইল';

  @override
  String get tabIncoming => 'আগত';

  @override
  String get tabOutgoing => 'প্রেরিত';

  @override
  String get tabAssigned => 'বহনকৃত';

  @override
  String get tabCompleted => 'সম্পন্ন';

  @override
  String get searchParcels => 'ট্র্যাকিং আইডি, শিরোনাম বা ব্যক্তি খুঁজুন';

  @override
  String get noParcels => 'এখানে এখনও কোনো পার্সেল নেই';

  @override
  String get noParcelsHint =>
      'আপনি যে পার্সেল পাঠান, গ্রহণ করেন বা বহন করেন তা এখানে দেখাবে।';

  @override
  String get noMatches => 'এই অনুসন্ধানে কোনো পার্সেল নেই';

  @override
  String get allCaughtUp => 'সব কাজ শেষ';

  @override
  String get nothingWaiting => 'আপনার অপেক্ষায় কোনো পার্সেল নেই।';

  @override
  String get from => 'প্রেরক';

  @override
  String get to => 'প্রাপক';

  @override
  String get carrier => 'বাহক';

  @override
  String get timeline => 'হেফাজতের সময়রেখা';

  @override
  String get details => 'বিস্তারিত';

  @override
  String get priority => 'অগ্রাধিকার';

  @override
  String get classification => 'শ্রেণীবিভাগ';

  @override
  String get category => 'বিভাগ';

  @override
  String get receipt => 'প্রাপ্তি';

  @override
  String get receivedBy => 'গ্রহণ করেছেন';

  @override
  String onBehalfOf(Object name) {
    return '$name-এর পক্ষে';
  }

  @override
  String get verifiedBy => 'যাচাই';

  @override
  String get attachments => 'প্রমাণ ও সংযুক্তি';

  @override
  String get notes => 'নোট';

  @override
  String get showQr => 'QR লেবেল';

  @override
  String get call => 'কল';

  @override
  String get upcoming => 'পরবর্তী';

  @override
  String expectedBy(Object time) {
    return '$time-এর মধ্যে প্রত্যাশিত';
  }

  @override
  String get overdue => 'সময় অতিক্রান্ত';

  @override
  String get exceptionOpen => 'সমস্যা চলমান';

  @override
  String sentOnBehalf(Object name) {
    return 'প্রেরকের পক্ষে $name বুক করেছেন';
  }

  @override
  String get contentHidden => 'আপনার ভূমিকার জন্য বিষয়বস্তু সীমিত।';

  @override
  String get actionAccept => 'দায়িত্ব গ্রহণ করুন';

  @override
  String get actionRequestHandover => 'হস্তান্তর অনুরোধ';

  @override
  String get actionConfirmHandover => 'হস্তান্তর নিশ্চিত করুন';

  @override
  String get actionEnterPin => 'প্রেরকের পিন দিন';

  @override
  String get actionOfficerHandover => 'ডিসপ্যাচ অফিসার হিসেবে নিশ্চিত করুন';

  @override
  String get actionStartTransit => 'যাত্রা শুরু করুন';

  @override
  String get actionCheckpoint => 'চেকপয়েন্ট যোগ করুন';

  @override
  String get actionArrived => 'পৌঁছেছে চিহ্নিত করুন';

  @override
  String get actionReceive => 'পার্সেল গ্রহণ করুন';

  @override
  String get actionReceiveOnBehalf => 'পক্ষে গ্রহণ করুন';

  @override
  String get actionReceiveWithCode => 'প্রাপকের কাছে কোড আছে';

  @override
  String get actionSendCode => 'প্রাপ্তি কোড পাঠান';

  @override
  String get actionException => 'সমস্যা জানান';

  @override
  String get actionCancel => 'ডিসপ্যাচ বাতিল';

  @override
  String get actionReturn => 'ফেরতের অনুরোধ';

  @override
  String get actionStartReturn => 'ফেরত শুরু';

  @override
  String get actionConfirmReturn => 'ফেরত পেয়েছি নিশ্চিত করুন';

  @override
  String get actionBook => 'এখন বুক করুন';

  @override
  String get actionComment => 'নোট যোগ করুন';

  @override
  String confirmHandoverBody(Object name) {
    return 'নিশ্চিত করুন যে আপনি পার্সেলটি $name-কে হস্তান্তর করেছেন। সময় ও আপনার নাম রেকর্ড হবে।';
  }

  @override
  String get pinTitle => 'প্রেরকের হস্তান্তর পিন';

  @override
  String get pinHint =>
      'বুকিংয়ের সময় প্রেরক যে ৬-সংখ্যার পিন পেয়েছেন তা চেয়ে নিন।';

  @override
  String get receiveTitle => 'প্রাপ্তি নিশ্চিত করুন';

  @override
  String get receiveBody =>
      'নিশ্চিত করুন যে পার্সেলটি আপনার হাতে। প্রমাণ হিসেবে আপনার নাম, কর্মী আইডি ও সময় রেকর্ড হবে।';

  @override
  String get scanToReceive => 'গ্রহণ করতে লেবেল স্ক্যান করুন';

  @override
  String get onBehalfTitle => 'পক্ষে গ্রহণ';

  @override
  String onBehalfBody(Object name) {
    return 'আপনি $name-এর পক্ষে এটি গ্রহণ করছেন। তাঁকে জানানো হবে।';
  }

  @override
  String get reasonLabel => 'কারণ';

  @override
  String get reasonHint => 'যেমন: প্রাপক মিটিংয়ে আছেন';

  @override
  String get relationshipLabel => 'আপনার সম্পর্ক';

  @override
  String get relationshipHint => 'যেমন: সহকারী, একই বিভাগ';

  @override
  String get receiptCodeTitle => 'প্রাপকের কোড';

  @override
  String get receiptCodeBody =>
      'প্রাপক SMS-এ যে ৬-সংখ্যার কোড পেয়েছেন তা দিন।';

  @override
  String get signature => 'প্রাপকের স্বাক্ষর';

  @override
  String get signatureRequired =>
      'অতি গোপনীয় পার্সেলের জন্য স্বাক্ষর প্রয়োজন।';

  @override
  String get clear => 'মুছুন';

  @override
  String get exceptionType => 'কী হয়েছে?';

  @override
  String get exceptionDetails => 'বিস্তারিত';

  @override
  String get returnTitle => 'ফেরতের অনুরোধ';

  @override
  String get cancelTitle => 'এই ডিসপ্যাচ বাতিল করবেন?';

  @override
  String get checkpointLabel => 'আপনি কোথায়?';

  @override
  String get checkpointHint => 'যেমন: ফ্যাক্টরি এ প্রধান গেট';

  @override
  String get submit => 'জমা দিন';

  @override
  String get confirm => 'নিশ্চিত করুন';

  @override
  String get cancel => 'বাতিল';

  @override
  String get close => 'বন্ধ';

  @override
  String get done => 'সম্পন্ন';

  @override
  String get next => 'পরবর্তী';

  @override
  String get back => 'পেছনে';

  @override
  String get retry => 'আবার চেষ্টা করুন';

  @override
  String get savedOffline =>
      'অফলাইনে সংরক্ষিত। অনলাইনে ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।';

  @override
  String pendingSync(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি কাজ সিঙ্কের অপেক্ষায়',
      one: '১টি কাজ সিঙ্কের অপেক্ষায়',
    );
    return '$_temp0';
  }

  @override
  String get syncNow => 'এখন সিঙ্ক করুন';

  @override
  String get syncNeedsAttention => 'মনোযোগ প্রয়োজন';

  @override
  String get offline => 'আপনি অফলাইনে';

  @override
  String get dismiss => 'সরান';

  @override
  String get newParcel => 'নতুন পার্সেল';

  @override
  String get stepWhat => 'কী';

  @override
  String get stepWho => 'কাকে';

  @override
  String get stepHow => 'বাহক';

  @override
  String get stepReview => 'পর্যালোচনা';

  @override
  String get titleLabel => 'শিরোনাম';

  @override
  String get titleHint => 'যেমন: ত্রৈমাসিক সরবরাহকারী চুক্তি';

  @override
  String get descriptionLabel => 'বিবরণ';

  @override
  String get descriptionHint => 'ভিতরে কী আছে এবং পরিচালনার নির্দেশনা';

  @override
  String get receiverEmployee => 'কর্মী';

  @override
  String get receiverDepartment => 'বিভাগ';

  @override
  String get receiverBranch => 'অফিস';

  @override
  String get receiverExternal => 'বাহ্যিক';

  @override
  String get searchEmployee => 'নাম, আইডি, ফোন বা বিভাগ খুঁজুন';

  @override
  String get destination => 'গন্তব্য';

  @override
  String get carrierEmployee => 'ABG কর্মী';

  @override
  String get carrierCourier => 'কুরিয়ার কোম্পানি';

  @override
  String get carrierGuest => 'অতিথি ব্যক্তি';

  @override
  String get assignLater => 'ডিসপ্যাচকে কুরিয়ার নির্ধারণ করতে দিন';

  @override
  String get courierCompany => 'কুরিয়ার কোম্পানি';

  @override
  String get trackingNumberLabel => 'কুরিয়ার ট্র্যাকিং / কনসাইনমেন্ট নং';

  @override
  String get riderName => 'রাইডারের নাম (ঐচ্ছিক)';

  @override
  String get riderPhone => 'রাইডারের ফোন (ঐচ্ছিক)';

  @override
  String get guestName => 'পূর্ণ নাম';

  @override
  String get guestCompany => 'প্রতিষ্ঠান (ঐচ্ছিক)';

  @override
  String get vehicleNumber => 'গাড়ির নম্বর (ঐচ্ছিক)';

  @override
  String get externalName => 'প্রাপকের নাম';

  @override
  String get externalOrg => 'প্রতিষ্ঠান';

  @override
  String get externalAddress => 'ডেলিভারি ঠিকানা';

  @override
  String get expectedDelivery => 'প্রত্যাশিত ডেলিভারি';

  @override
  String get noDeadline => 'সময়সীমা নেই';

  @override
  String get bookParcel => 'পার্সেল বুক করুন';

  @override
  String get saveDraft => 'খসড়া হিসেবে রাখুন';

  @override
  String get reviewNotice =>
      'বুকিং করলে একটি ট্র্যাকিং আইডি ও QR লেবেল তৈরি হবে। এখন থেকে প্রতিটি হস্তান্তর রেকর্ড হবে।';

  @override
  String get bookedTitle => 'পার্সেল বুক হয়েছে';

  @override
  String get bookedBody => 'QR লেবেলটি খাম বা প্যাকেজে লাগান।';

  @override
  String get handoverPin => 'হস্তান্তর পিন';

  @override
  String get handoverPinHint =>
      'পার্সেল হস্তান্তরের মুহূর্তেই কেবল কুরিয়ারকে এই পিন দিন।';

  @override
  String get viewParcel => 'পার্সেল দেখুন';

  @override
  String get bookAnother => 'আরেকটি বুক করুন';

  @override
  String get required => 'আবশ্যক';

  @override
  String get scanTitle => 'পার্সেল স্ক্যান';

  @override
  String get scanHint => 'QR লেবেলটি ফ্রেমের ভিতরে আনুন';

  @override
  String get enterManually => 'ট্র্যাকিং আইডি লিখুন';

  @override
  String get trackingIdLabel => 'ট্র্যাকিং আইডি';

  @override
  String get lookUp => 'খুঁজুন';

  @override
  String get cameraUnavailable =>
      'এই ডিভাইসে ক্যামেরা নেই। ট্র্যাকিং আইডি লিখুন।';

  @override
  String get torch => 'টর্চ';

  @override
  String get notificationsTitle => 'নোটিফিকেশন';

  @override
  String get filterAll => 'সব';

  @override
  String get filterAction => 'পদক্ষেপ প্রয়োজন';

  @override
  String get filterUpdates => 'আপডেট';

  @override
  String get filterSystem => 'সিস্টেম';

  @override
  String get markAllRead => 'সব পড়া হয়েছে';

  @override
  String get noNotifications => 'এখনও কোনো নোটিফিকেশন নেই';

  @override
  String get profileTitle => 'প্রোফাইল';

  @override
  String get employeeId => 'কর্মী আইডি';

  @override
  String get department => 'বিভাগ';

  @override
  String get office => 'অফিস';

  @override
  String get phone => 'ফোন';

  @override
  String get email => 'ইমেইল';

  @override
  String get settings => 'সেটিংস';

  @override
  String get language => 'ভাষা';

  @override
  String get pushNotifications => 'পুশ নোটিফিকেশন';

  @override
  String get smsNotifications => 'SMS নোটিফিকেশন';

  @override
  String get sessions => 'সাইন-ইন ডিভাইস';

  @override
  String get thisDevice => 'এই ডিভাইস';

  @override
  String get signOut => 'সাইন আউট';

  @override
  String get signOutConfirm => 'এই ডিভাইস থেকে ABG ONE সাইন আউট করবেন?';

  @override
  String get help => 'সহায়তা';

  @override
  String get helpBody =>
      'হেড অফিস, লেভেল ২-এর ডিসপ্যাচ ডেস্কে যোগাযোগ করুন অথবা ০৯৬১২-০০০১০০ নম্বরে কল করুন।';

  @override
  String get privacy => 'গোপনীয়তা ও নিরাপত্তা';

  @override
  String get privacyBody =>
      'আপনার সাইন-ইন ডিভাইসের নিরাপদ কী-স্টোরে সংরক্ষিত। QR লেবেলে কোনো ব্যক্তিগত তথ্য থাকে না। প্রতিটি হেফাজত কার্যক্রম আপনার নাম ও সার্ভার সময়সহ রেকর্ড হয়।';

  @override
  String version(Object version) {
    return 'সংস্করণ $version';
  }

  @override
  String get roles => 'ভূমিকা';

  @override
  String get errorNetwork =>
      'ABG ONE-এ পৌঁছানো যাচ্ছে না। সংযোগ দেখে আবার চেষ্টা করুন।';

  @override
  String get errorGeneric => 'কাজটি হয়নি। আবার চেষ্টা করুন।';

  @override
  String guestHello(Object name) {
    return 'হ্যালো, $name';
  }

  @override
  String get guestAssignments => 'আপনার দায়িত্ব';

  @override
  String get guestNoAssignments => 'এই মুহূর্তে কোনো সক্রিয় দায়িত্ব নেই।';

  @override
  String get guestSessionNote =>
      'এই বাহক সেশনে শুধু আপনাকে দেওয়া পার্সেল দেখা যায় এবং এটি স্বয়ংক্রিয়ভাবে শেষ হয়।';

  @override
  String get justNow => 'এইমাত্র';

  @override
  String minutesAgo(int count) {
    return '$count মিনিট আগে';
  }

  @override
  String hoursAgo(int count) {
    return '$count ঘণ্টা আগে';
  }

  @override
  String get yesterday => 'গতকাল';

  @override
  String get statusDRAFT => 'খসড়া';

  @override
  String get statusBOOKED => 'বুক করা';

  @override
  String get statusAWAITING_PICKUP => 'পিকআপের অপেক্ষায়';

  @override
  String get statusPICKED_UP => 'পিকআপ হয়েছে';

  @override
  String get statusIN_TRANSIT => 'পথে আছে';

  @override
  String get statusARRIVED_AT_DESTINATION => 'পৌঁছেছে';

  @override
  String get statusPENDING_RECEIPT => 'প্রাপ্তির অপেক্ষায়';

  @override
  String get statusRECEIVED => 'গৃহীত';

  @override
  String get statusON_HOLD => 'স্থগিত';

  @override
  String get statusDELIVERY_EXCEPTION => 'সমস্যা';

  @override
  String get statusDELIVERY_FAILED => 'ডেলিভারি ব্যর্থ';

  @override
  String get statusRETURN_REQUESTED => 'ফেরতের অনুরোধ';

  @override
  String get statusRETURN_IN_TRANSIT => 'ফেরত পথে';

  @override
  String get statusRETURNED => 'ফেরত এসেছে';

  @override
  String get statusCANCELLED => 'বাতিল';

  @override
  String get priorityNORMAL => 'সাধারণ';

  @override
  String get priorityPRIORITY => 'অগ্রাধিকার';

  @override
  String get priorityURGENT => 'জরুরি';

  @override
  String get priorityCRITICAL => 'অতি জরুরি';

  @override
  String get classNORMAL => 'সাধারণ';

  @override
  String get classINTERNAL => 'অভ্যন্তরীণ';

  @override
  String get classCONFIDENTIAL => 'গোপনীয়';

  @override
  String get classHIGHLY_CONFIDENTIAL => 'অতি গোপনীয়';

  @override
  String get carrierTypeINTERNAL_EMPLOYEE => 'কর্মী কুরিয়ার';

  @override
  String get carrierTypeEXTERNAL_COURIER => 'কুরিয়ার কোম্পানি';

  @override
  String get carrierTypeGUEST_PERSON => 'অতিথি বাহক';

  @override
  String get excRECEIVER_UNAVAILABLE => 'প্রাপক উপস্থিত নেই';

  @override
  String get excWRONG_DESTINATION => 'ভুল গন্তব্য';

  @override
  String get excADDRESS_CLARIFICATION => 'ঠিকানা স্পষ্ট নয়';

  @override
  String get excPACKAGE_DAMAGED => 'প্যাকেজ ক্ষতিগ্রস্ত';

  @override
  String get excOFFICE_CLOSED => 'অফিস বন্ধ';

  @override
  String get excSEAL_BROKEN => 'সিল ভাঙা';

  @override
  String get excAWAITING_AUTHORIZATION => 'অনুমোদনের অপেক্ষায়';

  @override
  String get excOTHER => 'অন্যান্য';

  @override
  String dispatchedTo(Object from, Object to) {
    return '$from → $to';
  }

  @override
  String get trackingCopied => 'ট্র্যাকিং আইডি কপি হয়েছে';

  @override
  String get handoverRequested => 'প্রেরককে নিশ্চিত করতে বলা হয়েছে।';

  @override
  String receiptCodeSent(Object phone) {
    return '$phone নম্বরে কোড পাঠানো হয়েছে';
  }

  @override
  String get addEvidence => 'ছবি প্রমাণ যোগ করুন';

  @override
  String get evidenceAdded => 'প্রমাণ সংযুক্ত হয়েছে';

  @override
  String get evidenceHint =>
      'সিল করা খাম বা প্যাকেজের ছবি তুলুন — কখনোই ভিতরের বিষয়বস্তুর নয়।';

  @override
  String sentToPhone(Object phone) {
    return '$phone নম্বরে পাঠানো হয়েছে';
  }

  @override
  String get you => 'আপনি';

  @override
  String get moreActions => 'আরও কাজ';

  @override
  String get incReport => 'ঘটনা জানান';

  @override
  String get incReportHint =>
      'কোনো সমস্যা চোখে পড়েছে? ছবি তুলুন — আপনার অফিসের অ্যাডমিনরা সঙ্গে সঙ্গে জানবেন।';

  @override
  String get incMyReports => 'আমার রিপোর্ট';

  @override
  String incOpenCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি চলমান রিপোর্ট',
      one: '১টি চলমান রিপোর্ট',
      zero: 'কোনো চলমান রিপোর্ট নেই',
    );
    return '$_temp0';
  }

  @override
  String get incWhatKind => 'কী ধরনের সমস্যা?';

  @override
  String get incTitleLabel => 'শিরোনাম';

  @override
  String get incTitleHint =>
      'যেমন: লিফট ২-এর পাশে দেয়ালের প্লাস্টার খসে পড়ছে';

  @override
  String get incDescriptionLabel => 'আপনি কী দেখেছেন? (ঐচ্ছিক)';

  @override
  String get incWhere => 'কোথায়?';

  @override
  String get incOffice => 'অফিস';

  @override
  String get incArea => 'এলাকা (ঐচ্ছিক)';

  @override
  String get incAreaAny => 'নিশ্চিত নই / অফিসের কোথাও';

  @override
  String get incSpot => 'নির্দিষ্ট জায়গা (ঐচ্ছিক)';

  @override
  String get incSpotHint => 'যেমন: ৩য় তলা, লিফটের পাশে';

  @override
  String get incHowUrgent => 'কতটা জরুরি?';

  @override
  String get incPhotos => 'ছবি';

  @override
  String get incPhotosHint =>
      'সর্বোচ্চ ৩টি ছবি যোগ করুন। পরিষ্কার ছবি দ্রুত সমাধানে সাহায্য করে।';

  @override
  String get incTakePhoto => 'ছবি তুলুন';

  @override
  String get incChoosePhoto => 'গ্যালারি';

  @override
  String get incRemovePhoto => 'ছবি সরান';

  @override
  String get incAnonymous => 'নাম গোপন রেখে জানান';

  @override
  String get incAnonymousHint =>
      'অ্যাডমিনরা আপনার নাম দেখবেন না। শুধু আপনি অবস্থা দেখতে পারবেন বলে এটি সংরক্ষিত থাকে।';

  @override
  String get incMisconductNote =>
      'অসদাচরণের রিপোর্ট কেবল প্রধান কার্যালয়ে যায় — কখনো আপনার অফিসের অ্যাডমিনদের কাছে নয়।';

  @override
  String get incSubmit => 'রিপোর্ট জমা দিন';

  @override
  String incSubmitted(Object ref) {
    return 'রিপোর্ট $ref পাঠানো হয়েছে। অ্যাডমিন দলকে জানানো হয়েছে।';
  }

  @override
  String get incTitleRequired => 'একটি ছোট শিরোনাম দিন (অন্তত ৩ অক্ষর)';

  @override
  String get incCategoryRequired => 'সমস্যার ধরন বেছে নিন';

  @override
  String get incNoReports => 'এখনো কোনো রিপোর্ট নেই';

  @override
  String get incNoReportsHint =>
      'কোনো সমস্যা জানালে এখানে এর অগ্রগতি দেখতে পারবেন।';

  @override
  String get incFilterOpen => 'চলমান';

  @override
  String get incFilterClosed => 'বন্ধ';

  @override
  String get incFilterAll => 'সব';

  @override
  String get incStatusPENDING => 'অপেক্ষমাণ';

  @override
  String get incStatusPROCESSING => 'প্রক্রিয়াধীন';

  @override
  String get incStatusDONE => 'সম্পন্ন';

  @override
  String get incStatusDECLINED => 'প্রত্যাখ্যাত';

  @override
  String get incCatBUILDING_DAMAGE => 'ভবনের ক্ষতি';

  @override
  String get incCatCLEANLINESS => 'পরিচ্ছন্নতা';

  @override
  String get incCatCAFETERIA_HYGIENE => 'ক্যাফেটেরিয়ার স্বাস্থ্যবিধি';

  @override
  String get incCatWASHROOM => 'ওয়াশরুম';

  @override
  String get incCatSAFETY_HAZARD => 'নিরাপত্তা ঝুঁকি';

  @override
  String get incCatELECTRICAL => 'বৈদ্যুতিক';

  @override
  String get incCatSECURITY => 'সিকিউরিটি';

  @override
  String get incCatMISCONDUCT => 'অসদাচরণ';

  @override
  String get incCatOTHER => 'অন্যান্য';

  @override
  String get incSevLOW => 'কম';

  @override
  String get incSevMEDIUM => 'মাঝারি';

  @override
  String get incSevHIGH => 'বেশি';

  @override
  String get incSevURGENT => 'জরুরি';

  @override
  String get incProgress => 'অগ্রগতি';

  @override
  String get incStepSubmitted => 'জমা হয়েছে';

  @override
  String get incStepProcessing => 'প্রক্রিয়াধীন';

  @override
  String get incStepDone => 'সম্পন্ন';

  @override
  String get incStepDeclined => 'প্রত্যাখ্যাত';

  @override
  String get incAdminUpdate => 'অ্যাডমিন দলের আপডেট';

  @override
  String get incReportedBy => 'রিপোর্টকারী';

  @override
  String get incAnonymousBadge => 'নাম গোপন';

  @override
  String get incAddPhoto => 'আরেকটি ছবি যোগ করুন';

  @override
  String get incPhotoAdded => 'ছবি যোগ হয়েছে';

  @override
  String get incFixPhotos => 'সমাধানের ছবি';

  @override
  String get incHistory => 'ইতিহাস';

  @override
  String get incEvSubmitted => 'রিপোর্ট জমা হয়েছে';

  @override
  String incEvStatus(Object status) {
    return '$status হিসেবে চিহ্নিত';
  }

  @override
  String get incEvReopened => 'পুনরায় খোলা হয়েছে';

  @override
  String get incEvNote => 'আপনার জন্য আপডেট';

  @override
  String get incEvPhoto => 'ছবি যোগ হয়েছে';

  @override
  String get incEvDetails => 'বিবরণ হালনাগাদ হয়েছে';

  @override
  String get incWaitingForAdmin => 'অ্যাডমিন দলের পদক্ষেপের অপেক্ষায়।';

  @override
  String get incOfflineNotice =>
      'আপনি অফলাইনে আছেন। ছবিসহ রিপোর্টের জন্য সংযোগ প্রয়োজন — অনলাইনে ফিরে আবার চেষ্টা করুন।';

  @override
  String get pcTitle => 'পুল কার';

  @override
  String get pcRequestCar => 'গাড়ির অনুরোধ';

  @override
  String get pcTabMine => 'আমার অনুরোধ';

  @override
  String get pcTabApprove => 'অনুমোদনের জন্য';

  @override
  String get pcTabTrips => 'আমার ট্রিপ';

  @override
  String get pcFilterAll => 'সব';

  @override
  String get pcFilterOpen => 'চলমান';

  @override
  String get pcFilterClosed => 'সমাপ্ত';

  @override
  String get pcNoRequests => 'এখনও কোনো গাড়ির অনুরোধ নেই';

  @override
  String get pcNoRequestsHint =>
      'অফিসিয়াল কাজে পুল কারের অনুরোধ করুন। বরাদ্দ হলে এখানে চালকের তথ্য ও আপনার গেট পাস দেখবেন।';

  @override
  String get pcNoApprovals => 'অনুমোদনের কিছু নেই';

  @override
  String get pcNoApprovalsHint =>
      'আপনাকে বিভাগীয় প্রধান হিসেবে উল্লেখ করা আপনার দলের গাড়ির অনুরোধ এখানে দেখাবে।';

  @override
  String get pcNoTrips => 'কোনো ট্রিপ বরাদ্দ নেই';

  @override
  String get pcNoTripsHint =>
      'ফ্লিট ম্যানেজার যে ট্রিপ দেন তা এখানে দেখাবে, শুরু ও সম্পন্ন করার বোতামসহ।';

  @override
  String get pcUrgent => 'জরুরি';

  @override
  String pcPeople(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count জন',
      one: '১ জন',
    );
    return '$_temp0';
  }

  @override
  String pcSeats(int count) {
    return '$count আসন';
  }

  @override
  String get pcStatusPENDING_HOD => 'বিভাগীয় প্রধানের অপেক্ষায়';

  @override
  String get pcStatusPENDING_FLEET => 'ফ্লিট ম্যানেজারের অপেক্ষায়';

  @override
  String get pcStatusASSIGNED => 'বরাদ্দকৃত';

  @override
  String get pcStatusIN_PROGRESS => 'চলমান';

  @override
  String get pcStatusCOMPLETED => 'সম্পন্ন';

  @override
  String get pcStatusREJECTED => 'প্রত্যাখ্যাত';

  @override
  String get pcStatusCANCELLED => 'বাতিল';

  @override
  String get pcTripONE_WAY => 'একমুখী';

  @override
  String get pcTripROUND_TRIP => 'যাওয়া-আসা';

  @override
  String get pcTripFULL_DAY => 'সারা দিন';

  @override
  String get pcTripAIRPORT => 'বিমানবন্দর ট্রান্সফার';

  @override
  String get pcTripHintONE_WAY => 'শুধু পৌঁছে দেওয়া';

  @override
  String get pcTripHintROUND_TRIP => 'গিয়ে ফিরে আসা';

  @override
  String get pcTripHintFULL_DAY => 'গাড়ি সারা দিন সঙ্গে';

  @override
  String get pcTripHintAIRPORT => 'আনা বা পৌঁছে দেওয়া';

  @override
  String get pcVehANY => 'যেকোনো গাড়ি';

  @override
  String get pcVehSEDAN => 'সেডান';

  @override
  String get pcVehSUV => 'এসইউভি';

  @override
  String get pcVehMICROBUS => 'মাইক্রোবাস';

  @override
  String get pcVehPICKUP => 'পিকআপ';

  @override
  String get pcVehCOASTER => 'কোস্টার';

  @override
  String get pcFormTitle => 'পুল কারের অনুরোধ';

  @override
  String get pcFormIntro =>
      'আপনার বিভাগীয় প্রধান অনুমোদন করবেন, তারপর ফ্লিট ম্যানেজার গাড়ি ও চালক বরাদ্দ দেবেন। আপনি চালকের নম্বর ও একটি QR গেট পাস পাবেন।';

  @override
  String get pcTripKind => 'ট্রিপের ধরন';

  @override
  String get pcPurpose => 'ট্রিপের উদ্দেশ্য';

  @override
  String get pcPurposeHint => 'যেমন: সুপ্রিম কোর্টে শুনানি';

  @override
  String get pcPickupFrom => 'যেখান থেকে উঠবেন';

  @override
  String get pcGoingTo => 'যেখানে যাবেন';

  @override
  String get pcPickupTime => 'যাত্রার সময়';

  @override
  String get pcReturnTime => 'ফেরার সময়';

  @override
  String get pcReturnOptional => 'ফেরার সময় (ঐচ্ছিক)';

  @override
  String get pcChooseTime => 'তারিখ ও সময় বেছে নিন';

  @override
  String get pcClearReturn => 'ফেরা নেই';

  @override
  String get pcPassengers => 'যাত্রী';

  @override
  String get pcAddPassenger => 'যাত্রী যোগ করুন';

  @override
  String get pcPassengerName => 'পূর্ণ নাম';

  @override
  String get pcPassengerPhone => 'মোবাইল (ঐচ্ছিক)';

  @override
  String get pcRemovePassenger => 'যাত্রী সরান';

  @override
  String get pcPeopleCount => 'যাত্রীর সংখ্যা';

  @override
  String pcPeopleCountHint(int max) {
    return 'আপনাসহ · সর্বোচ্চ $max জন';
  }

  @override
  String get pcVehiclePreference => 'পছন্দের গাড়ি';

  @override
  String get pcUrgentHint =>
      'অল্প সময়ের নোটিশে দরকার — অনুমোদনকারী এটি আগে দেখবেন';

  @override
  String get pcApprover => 'অনুমোদনকারী';

  @override
  String get pcApproverHint => 'আপনার বিভাগীয় প্রধান';

  @override
  String get pcChange => 'পরিবর্তন';

  @override
  String get pcNoManager =>
      'রেকর্ডে কোনো বিভাগীয় প্রধান নেই — একজন অনুমোদনকারী বেছে নিন';

  @override
  String pcApproverNoAccount(Object name) {
    return '$name অনুমোদনের জন্য সাইন ইন করতে পারেন না। অন্য কাউকে বেছে নিন।';
  }

  @override
  String get pcSearchApprover => 'নাম, আইডি বা বিভাগ খুঁজুন';

  @override
  String get pcNoAccount => 'অ্যাকাউন্ট নেই';

  @override
  String get pcSend => 'অনুমোদনের জন্য পাঠান';

  @override
  String pcSent(Object ref) {
    return '$ref অনুমোদনের জন্য পাঠানো হয়েছে';
  }

  @override
  String get pcPurposeRequired => 'গাড়ি কী কাজে লাগবে তা লিখুন';

  @override
  String get pcPlacesRequired => 'ওঠা ও নামার স্থান দিন';

  @override
  String get pcPickupPast => 'যাত্রার সময় পেরিয়ে গেছে';

  @override
  String get pcReturnRequired =>
      'যাওয়া-আসা ও সারা দিনের ট্রিপে ফেরার সময় দিতে হবে';

  @override
  String get pcReturnBeforePickup => 'ফেরার সময় যাত্রার পরে হতে হবে';

  @override
  String get pcTooManyNamed => 'যাত্রীর সংখ্যার চেয়ে বেশি নাম দেওয়া হয়েছে';

  @override
  String get pcApproverRequired => 'কে অনুমোদন করবেন তা বেছে নিন';

  @override
  String get pcProgress => 'অগ্রগতি';

  @override
  String get pcStepHod => 'বিভাগীয় প্রধান';

  @override
  String get pcStepFleet => 'ফ্লিট';

  @override
  String get pcStepAssigned => 'বরাদ্দ';

  @override
  String get pcStepOnTrip => 'যাত্রাপথে';

  @override
  String get pcStepDone => 'সম্পন্ন';

  @override
  String pcWaitingHod(Object name) {
    return '$name-এর অনুমোদনের অপেক্ষায়।';
  }

  @override
  String get pcWaitingFleet =>
      'অনুমোদিত। এরপর ফ্লিট ম্যানেজার গাড়ি ও চালক বরাদ্দ দেবেন।';

  @override
  String get pcTrip => 'ট্রিপ';

  @override
  String get pcVehicleWanted => 'চাওয়া গাড়ি';

  @override
  String get pcCarDriver => 'গাড়ি ও চালক';

  @override
  String get pcCallDriver => 'চালককে কল করুন';

  @override
  String get pcDriver => 'চালক';

  @override
  String get pcNotAssignedYet =>
      'অনুমোদনের পর গাড়ি ও চালক বরাদ্দ হবে। এখানে চালকের নম্বর ও আপনার গেট পাস দেখবেন।';

  @override
  String get pcNoCar => 'কোনো গাড়ি বরাদ্দ হয়নি।';

  @override
  String get pcGatePass => 'গেট পাস';

  @override
  String get pcShowPass => 'গেট পাস দেখান';

  @override
  String get pcPassHint =>
      'গেটে এটি দেখান। গাড়ি বের হওয়া ও ফেরার সময় নিরাপত্তাকর্মী এটি স্ক্যান করবেন।';

  @override
  String pcPassValid(Object from, Object until) {
    return 'বৈধ $from – $until';
  }

  @override
  String pcOdometerRun(Object start, Object end, Object distance) {
    return '$start → $end কিমি · $distance কিমি চলেছে';
  }

  @override
  String get pcHistory => 'ইতিহাস';

  @override
  String get pcEvSubmitted => 'অনুরোধ করা হয়েছে';

  @override
  String get pcEvApproved => 'বিভাগীয় প্রধান অনুমোদন করেছেন';

  @override
  String get pcEvRejected => 'প্রত্যাখ্যাত';

  @override
  String get pcEvCancelled => 'বাতিল';

  @override
  String get pcEvAssigned => 'গাড়ি বরাদ্দ হয়েছে';

  @override
  String get pcEvReassigned => 'গাড়ি পরিবর্তন হয়েছে';

  @override
  String get pcEvStarted => 'ট্রিপ শুরু হয়েছে';

  @override
  String get pcEvCompleted => 'ট্রিপ সম্পন্ন হয়েছে';

  @override
  String get pcEvExit => 'গেট দিয়ে বের হয়েছে';

  @override
  String get pcEvReturn => 'গেট দিয়ে ফিরেছে';

  @override
  String get pcRequestedBy => 'অনুরোধকারী';

  @override
  String get pcHod => 'বিভাগীয় প্রধান';

  @override
  String get pcApprove => 'অনুমোদন';

  @override
  String get pcReject => 'প্রত্যাখ্যান';

  @override
  String get pcAssign => 'গাড়ি বরাদ্দ';

  @override
  String get pcReassign => 'পুনরায় বরাদ্দ';

  @override
  String get pcStart => 'ট্রিপ শুরু';

  @override
  String get pcComplete => 'ট্রিপ সম্পন্ন';

  @override
  String get pcCancelRequest => 'অনুরোধ বাতিল';

  @override
  String get pcApproveTitle => 'এই অনুরোধ অনুমোদন করবেন?';

  @override
  String get pcApproveBody =>
      'এটি ফ্লিট ম্যানেজারের কাছে যাবে, তিনি গাড়ি ও চালক বরাদ্দ দেবেন। অনুরোধকারীকে জানানো হবে।';

  @override
  String get pcRejectTitle => 'এই অনুরোধ প্রত্যাখ্যান করুন';

  @override
  String get pcRejectReason => 'অনুরোধকারীর জন্য কারণ';

  @override
  String get pcReasonRequired => 'কমপক্ষে ৩ অক্ষরের একটি কারণ লিখুন';

  @override
  String get pcCancelTitle => 'এই অনুরোধ বাতিল করবেন?';

  @override
  String get pcCancelBody =>
      'অনুমোদনকারী বা ফ্লিট ম্যানেজারকে জানানো হবে। বরাদ্দকৃত গাড়ি ও চালক মুক্ত হবে এবং গেট পাস আর কাজ করবে না।';

  @override
  String get pcCancelReason => 'কারণ (ঐচ্ছিক)';

  @override
  String get pcOdometer => 'ওডোমিটার রিডিং (কিমি, ঐচ্ছিক)';

  @override
  String get pcStartTitle => 'ট্রিপ শুরু করুন';

  @override
  String get pcCompleteTitle => 'ট্রিপ সম্পন্ন করুন';

  @override
  String pcLastOdometer(Object km) {
    return 'সর্বশেষ রেকর্ড $km কিমি';
  }

  @override
  String get pcApproved => 'অনুমোদিত — ফ্লিট ম্যানেজারের কাছে পাঠানো হয়েছে';

  @override
  String get pcRejected => 'প্রত্যাখ্যাত — অনুরোধকারীকে জানানো হয়েছে';

  @override
  String get pcStarted => 'ট্রিপ শুরু হয়েছে';

  @override
  String get pcCompleted => 'ট্রিপ সম্পন্ন — গাড়ি আবার খালি';

  @override
  String get pcCancelled => 'অনুরোধ বাতিল হয়েছে';

  @override
  String get pcAssigned => 'গাড়ি ও চালক বরাদ্দ হয়েছে';

  @override
  String get pcChooseVehicle => 'গাড়ি';

  @override
  String get pcChooseDriver => 'চালক';

  @override
  String get pcFreeForTrip => 'এই ট্রিপের জন্য খালি';

  @override
  String get pcMatchesRequest => 'অনুরোধের সাথে মেলে';

  @override
  String get pcReassignNote =>
      'পুনরায় বরাদ্দ দিলে নতুন গেট পাস তৈরি হবে; পুরোনো QR আর কাজ করবে না।';

  @override
  String get pcPassTitle => 'গাড়ির গেট পাস';

  @override
  String get pcPassVALID => 'বৈধ গেট পাস';

  @override
  String get pcPassOUT => 'গাড়ি এই ট্রিপে বাইরে আছে';

  @override
  String get pcPassUSED => 'ট্রিপ সম্পন্ন — পাস ব্যবহৃত';

  @override
  String get pcPassCANCELLED => 'বৈধ নয় — ট্রিপ বাতিল';

  @override
  String get pcPassEXPIRED => 'বৈধ নয় — পাসের মেয়াদ শেষ';

  @override
  String get pcPassNOT_YET_VALID => 'এখনও বৈধ নয়';

  @override
  String get pcPassINVALID => 'বৈধ গেট পাস নয়';

  @override
  String get pcPassInvalidBody =>
      'এই কোড ABG ONE দেয়নি, অথবা এটি বদলে গেছে। গাড়িকে যেতে দেবেন না — ফ্লিট ডেস্কে কল করুন।';

  @override
  String get pcRecordExit => 'বের হওয়া রেকর্ড';

  @override
  String get pcRecordReturn => 'ফেরা রেকর্ড';

  @override
  String get pcExitRecorded => 'বের হওয়া রেকর্ড হয়েছে — ট্রিপ শুরু';

  @override
  String get pcReturnRecorded => 'ফেরা রেকর্ড হয়েছে — ট্রিপ সম্পন্ন';

  @override
  String get pcGateRecord => 'গেট রেকর্ড';

  @override
  String get pcLeftGate => 'গেট দিয়ে বের হয়েছে';

  @override
  String get pcReturned => 'ফিরেছে';

  @override
  String get pcPassNotAllowed =>
      'শুধু নিরাপত্তাকর্মী, ফ্রন্ট ডেস্ক ও ফ্লিট ম্যানেজার গেট পাস যাচাই করতে পারেন।';

  @override
  String pcTravelling(int count) {
    return '$count জন যাচ্ছেন';
  }

  @override
  String get pcValidity => 'পাসের মেয়াদ';

  @override
  String pcLicence(Object number) {
    return 'লাইসেন্স $number';
  }

  @override
  String get pcRequester => 'অনুরোধকারী';
}
