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
  String get visTitle => 'ভিজিটর';

  @override
  String get visMyVisitors => 'আমার ভিজিটর';

  @override
  String get visGate => 'গেট';

  @override
  String get visInvite => 'ভিজিটর আমন্ত্রণ';

  @override
  String get visUpcoming => 'আসন্ন';

  @override
  String get visPast => 'আগের';

  @override
  String get visNoUpcoming => 'কোনো ভিজিটর আসছেন না';

  @override
  String get visNoUpcomingHint =>
      'ভিজিটরকে আমন্ত্রণ জানালে তিনি এসএমএসে গেট পাস নম্বর পাবেন। তিনি এলে ও চলে গেলে আপনাকে জানানো হবে।';

  @override
  String get visNoPast => 'এখনও আগের কোনো ভিজিটর নেই';

  @override
  String get visStatusEXPECTED => 'প্রত্যাশিত';

  @override
  String get visStatusCHECKED_IN => 'সাইটে আছেন';

  @override
  String get visStatusCHECKED_OUT => 'চলে গেছেন';

  @override
  String get visStatusCANCELLED => 'বাতিল';

  @override
  String get visStatusEXPIRED => 'আসেননি';

  @override
  String visStatusSemantics(Object status) {
    return 'অবস্থা: $status';
  }

  @override
  String get visPurposeMEETING => 'মিটিং';

  @override
  String get visPurposeINTERVIEW => 'ইন্টারভিউ';

  @override
  String get visPurposeVENDOR_SUPPLIER => 'ভেন্ডর / সরবরাহকারী';

  @override
  String get visPurposeCONTRACTOR => 'ঠিকাদারি কাজ';

  @override
  String get visPurposeAUDIT_INSPECTION => 'অডিট / পরিদর্শন';

  @override
  String get visPurposeGOVERNMENT_OFFICIAL => 'সরকারি কর্মকর্তা';

  @override
  String get visPurposeDELIVERY => 'ডেলিভারি';

  @override
  String get visPurposePERSONAL => 'ব্যক্তিগত';

  @override
  String get visPurposeOTHER => 'অন্যান্য';

  @override
  String get visWalkIn => 'ওয়াক-ইন';

  @override
  String get visOverstay => 'নির্ধারিত সময় পেরিয়েছে';

  @override
  String visInSince(Object time) {
    return '$time থেকে ভেতরে';
  }

  @override
  String visLeftAt(Object time) {
    return '$time-এ চলে গেছেন';
  }

  @override
  String visExpectedAt(Object time) {
    return 'প্রত্যাশিত $time';
  }

  @override
  String visHostIs(Object name) {
    return 'হোস্ট: $name';
  }

  @override
  String get visCheckIn => 'চেক-ইন';

  @override
  String get visCheckOut => 'চেক-আউট';

  @override
  String visCheckedIn(Object name) {
    return '$name চেক-ইন করেছেন — হোস্টকে জানানো হয়েছে।';
  }

  @override
  String visCheckedOut(Object name) {
    return '$name চেক-আউট করেছেন।';
  }

  @override
  String get visPassTitle => 'ভিজিটর গেট পাস';

  @override
  String visQrSemantics(Object number) {
    return 'গেট পাস $number-এর QR কোড';
  }

  @override
  String get visCopyPassNumber => 'পাস নম্বর কপি করুন';

  @override
  String get visPassNumberCopied => 'পাস নম্বর কপি হয়েছে';

  @override
  String get visValidToday =>
      'শুধু আজকের জন্য বৈধ · ঢোকা ও বের হওয়ার সময় গেটে দেখান';

  @override
  String visValidOn(Object date) {
    return 'শুধু $date তারিখে বৈধ · ঢোকা ও বের হওয়ার সময় গেটে দেখান';
  }

  @override
  String get visHost => 'হোস্ট';

  @override
  String get visPurpose => 'উদ্দেশ্য';

  @override
  String get visArea => 'এলাকা';

  @override
  String get visTime => 'সময়';

  @override
  String get visParty => 'দল';

  @override
  String visPartyCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count জন',
      one: '১ জন',
    );
    return '$_temp0';
  }

  @override
  String get visVehicle => 'গাড়ির নম্বর';

  @override
  String get visNone => 'নেই';

  @override
  String get visCarrying => 'সাথে আছে';

  @override
  String get visPassFooter =>
      'সাইটে ভিজিটর ব্যাজ পরে থাকুন এবং গেটে ফেরত দিন। ABG ONE থেকে ইস্যু করা।';

  @override
  String get visLiveOnSite => 'লাইভ · এখন সাইটে';

  @override
  String visOnSiteSemantics(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'এখন সাইটে $count জন ভিজিটর',
      one: 'এখন সাইটে ১ জন ভিজিটর',
      zero: 'এখন সাইটে কেউ নেই',
    );
    return '$_temp0';
  }

  @override
  String get visCounting => 'গণনা হচ্ছে…';

  @override
  String visPeopleOnSite(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'সাইটে $count জন',
      one: 'সাইটে ১ জন',
    );
    return '$_temp0';
  }

  @override
  String visStillExpected(int count) {
    return 'আজ আরও $count জন আসার কথা';
  }

  @override
  String visOverstaying(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count জন ভিজিটরের নির্ধারিত সময় পেরিয়েছে',
      one: '১ জন ভিজিটরের নির্ধারিত সময় পেরিয়েছে',
    );
    return '$_temp0';
  }

  @override
  String visLongest(Object name, Object time) {
    return 'সবচেয়ে বেশি সময় ধরে: $name · $time';
  }

  @override
  String get visScanPass => 'পাস স্ক্যান';

  @override
  String get visWalkInAction => 'ওয়াক-ইন';

  @override
  String get visStatCheckedOut => 'আজ চলে গেছেন';

  @override
  String get visStatWalkIns => 'আজকের ওয়াক-ইন';

  @override
  String get visStatVisits => 'আজকের ভিজিট';

  @override
  String get visPassNumberHint => 'পাস নম্বর লিখুন, যেমন VP-261021-FCA-012';

  @override
  String get visVerify => 'পাস যাচাই';

  @override
  String get visOnSiteNow => 'এখন সাইটে';

  @override
  String get visExpectedToday => 'আজ যাদের আসার কথা';

  @override
  String get visNobodyOnSite => 'এই মুহূর্তে সাইটে কেউ নেই।';

  @override
  String get visNobodyExpected => 'আজ আর কারও আসার কথা নেই।';

  @override
  String get visWalkInTitle => 'ওয়াক-ইন নিবন্ধন';

  @override
  String get visInviteHint =>
      'আপনি হোস্ট। আপনার ভিজিটর এসএমএসে গেট পাস নম্বর পাবেন, আর তিনি এলে ও চলে গেলে আপনাকে জানানো হবে।';

  @override
  String get visWalkInHint =>
      'যিনি পাস ছাড়া এসেছেন তার জন্য। এখনই চেক-ইন হবে এবং হোস্টকে জানানো হবে যে তিনি গেটে আছেন।';

  @override
  String get visVisitorSection => 'ভিজিটর';

  @override
  String get visVisitor => 'ভিজিটর';

  @override
  String get visNameLabel => 'ভিজিটরের নাম';

  @override
  String get visPhoneLabel => 'মোবাইল নম্বর';

  @override
  String get visPhoneHelper => 'গেট পাস নম্বর এই নম্বরে এসএমএস করা হবে।';

  @override
  String get visCompanyLabel => 'প্রতিষ্ঠান';

  @override
  String get visCompanyHint => 'যেমন: আকিজ প্যাকেজিং লিমিটেড, ডাইফ নারায়ণগঞ্জ';

  @override
  String get visPurposeTitle => 'ভিজিটের উদ্দেশ্য';

  @override
  String get visDetailLabel => 'কী কাজে (ঐচ্ছিক)';

  @override
  String get visDetailHint => 'যেমন: কার্টন নমুনা অনুমোদন';

  @override
  String get visHereToSee => 'যার কাছে এসেছেন';

  @override
  String get visSearchDirectory => 'ডিরেক্টরিতে খুঁজুন';

  @override
  String get visNotListed => 'তালিকায় নেই?';

  @override
  String get visHostNameLabel => 'যার বা যে দলের কাছে এসেছেন তাদের নাম';

  @override
  String get visChooseHost => 'যে কর্মীর কাছে এসেছেন তাকে বাছুন';

  @override
  String get visHostNoAccount => 'ABG ONE-এ নেই — সরাসরি জানান';

  @override
  String get visHostSearchHint => 'নাম, কর্মী আইডি বা বিভাগ';

  @override
  String get visWhenWhere => 'কখন ও কোথায়';

  @override
  String get visDate => 'তারিখ';

  @override
  String get visFrom => 'থেকে';

  @override
  String get visUntil => 'পর্যন্ত';

  @override
  String get visLeaveBy => 'যে সময়ের মধ্যে যাওয়ার কথা';

  @override
  String get visOptional => 'ঐচ্ছিক';

  @override
  String get visClear => 'মুছুন';

  @override
  String get visOffice => 'অফিস';

  @override
  String get visAreaAny => 'অফিসের যেকোনো জায়গা';

  @override
  String get visPartyLabel => 'এই পাসে কতজন';

  @override
  String get visPartyFewer => 'একজন কম';

  @override
  String get visPartyMore => 'একজন বেশি';

  @override
  String get visAtTheGate => 'গেটের জন্য';

  @override
  String get visBadgeLabel => 'ব্যাজ নম্বর (ঐচ্ছিক)';

  @override
  String get visCarryingHint => 'যেমন: ল্যাপটপ, যন্ত্রপাতি, নমুনা';

  @override
  String get visIdLast4Label => 'আইডি কার্ড — শুধু শেষ ৪টি';

  @override
  String get visIdLast4Helper => 'কখনও পুরো এনআইডি নম্বর লিখবেন না।';

  @override
  String get visNotesLabel => 'গেটের জন্য নোট';

  @override
  String get visSubmitInvite => 'গেট পাস তৈরি করুন';

  @override
  String get visSubmitWalkIn => 'নিবন্ধন করে চেক-ইন';

  @override
  String get visNameRequired => 'ভিজিটরের নাম লিখুন।';

  @override
  String get visPhoneInvalid =>
      'বাংলাদেশি মোবাইল নম্বর দিন, যেমন ০১৭১১ ২২৩৩৪৪।';

  @override
  String get visPurposeRequired => 'ভিজিটের উদ্দেশ্য বাছুন।';

  @override
  String get visIdLast4Invalid => 'আইডি: শুধু শেষ ৪টি সংখ্যা বা অক্ষর।';

  @override
  String get visHostRequired => 'ভিজিটর কার কাছে এসেছেন তা জানান।';

  @override
  String get visUntilPassed => 'যাওয়ার সেই সময় ইতিমধ্যে পেরিয়ে গেছে।';

  @override
  String get visTimePast =>
      'সেই সময় পেরিয়ে গেছে। এখন থেকে পরের কোনো সময় বাছুন।';

  @override
  String get visUntilBeforeStart => 'ভিজিট শুরুর পরেই শেষ হতে হবে।';

  @override
  String visPassCreated(Object pass) {
    return 'গেট পাস $pass তৈরি হয়েছে — ভিজিটরকে এসএমএসে নম্বর পাঠানো হয়েছে।';
  }

  @override
  String visWalkInDone(Object name, Object pass) {
    return '$name পাস $pass নিয়ে চেক-ইন করেছেন।';
  }

  @override
  String get visCopy => 'নম্বর কপি';

  @override
  String get visSendSms => 'এসএমএসে পাঠান';

  @override
  String get visDetailsCopied => 'পাসের বিবরণ কপি হয়েছে';

  @override
  String visSmsText(Object office, Object time, Object host, Object pass) {
    return 'ABG গেট পাস $pass · $office · $time · হোস্ট: $host। অনুগ্রহ করে গেটে এটি দেখান।';
  }

  @override
  String get visPassHidden =>
      'শুধু হোস্ট ও এই অফিসের গেট কর্মীরা QR গেট পাস দেখতে পারেন।';

  @override
  String get visProgress => 'ভিজিটের অবস্থা';

  @override
  String get visDetails => 'বিস্তারিত';

  @override
  String get visStepExpected => 'প্রত্যাশিত';

  @override
  String get visStepWalkIn => 'ওয়াক-ইন নিবন্ধিত';

  @override
  String get visStepOnSite => 'চেক-ইন';

  @override
  String get visStepOut => 'চেক-আউট';

  @override
  String get visStepCancelled => 'বাতিল';

  @override
  String get visStepExpired => 'আসেননি';

  @override
  String get visStepExpiredHint => 'দিন শেষে পাসটির মেয়াদ শেষ হয়েছে।';

  @override
  String visBy(Object name) {
    return '$name করেছেন';
  }

  @override
  String visOnSiteFor(Object time) {
    return 'সাইটে $time';
  }

  @override
  String visCheckInTitle(Object name) {
    return '$name-কে চেক-ইন করবেন?';
  }

  @override
  String get visCheckInBody =>
      'আইডি কার্ড দেখে ভিজিটর ব্যাজ দিন। হোস্টকে সঙ্গে সঙ্গে জানানো হবে।';

  @override
  String visCheckInBodyId(Object last4) {
    return 'আইডি কার্ড মিলিয়ে নিন (শেষ ৪টি: $last4) এবং ভিজিটর ব্যাজ দিন। হোস্টকে সঙ্গে সঙ্গে জানানো হবে।';
  }

  @override
  String visCheckOutTitle(Object name) {
    return '$name-কে চেক-আউট করবেন?';
  }

  @override
  String get visCheckOutBody => 'চেক-আউটের পর পাসটি আর ব্যবহার করা যাবে না।';

  @override
  String visCheckOutBodyBadge(Object badge) {
    return 'ব্যাজ $badge ফেরত নিন। চেক-আউটের পর পাসটি আর ব্যবহার করা যাবে না।';
  }

  @override
  String get visCancelPass => 'পাস বাতিল';

  @override
  String get visCancelTitle => 'এই গেট পাস বাতিল করবেন?';

  @override
  String visCancelBody(Object name) {
    return '$name-কে এসএমএসে জানানো হবে যে ভিজিট বাতিল হয়েছে, এবং পাসটি গেটে আর কাজ করবে না।';
  }

  @override
  String get visCancelReason => 'কারণ (ঐচ্ছিক)';

  @override
  String get visCancelled =>
      'গেট পাস বাতিল হয়েছে — ভিজিটরকে এসএমএসে জানানো হয়েছে।';

  @override
  String get visPassNotFound => 'পাসটি চেনা যায়নি';

  @override
  String get visPassNotFoundHint =>
      'এই পাসে ভিজিটরকে ঢুকতে দেবেন না — হোস্টকে ফোন করুন বা ওয়াক-ইন হিসেবে নিবন্ধন করুন।';

  @override
  String get visScanAnother => 'আরেকটি পাস স্ক্যান';

  @override
  String get visBlockWrongOffice => 'ভুল অফিস';

  @override
  String get visBlockWrongDay => 'আজ বৈধ নয়';

  @override
  String get visBlockCancelled => 'পাস বাতিল';

  @override
  String get visBlockExpired => 'পাসের মেয়াদ শেষ';

  @override
  String get visBlockAlreadyOut => 'পাস ইতিমধ্যে ব্যবহৃত';

  @override
  String get visBlockGeneric => 'বৈধ নয়';

  @override
  String get visVerdictValid => 'বৈধ পাস';

  @override
  String visVerdictValidBody(Object time, Object host) {
    return '$time সময়ে $host-এর কাছে আসার কথা। আইডি দেখে ভিজিটরকে চেক-ইন করুন।';
  }

  @override
  String get visVerdictOnSite => 'সাইটে আছেন';

  @override
  String visVerdictOnSiteBody(Object time) {
    return '$time-এ চেক-ইন করেছেন। যাওয়ার সময় চেক-আউট করুন।';
  }

  @override
  String get visVerdictGenuine => 'আসল পাস';

  @override
  String get visVerdictGenuineBody =>
      'আপনার ভূমিকায় পাস যাচাই করা যায়, কিন্তু চেক-ইন বা চেক-আউট নয়। নিরাপত্তা বা ফ্রন্ট ডেস্ককে বলুন।';

  @override
  String get visIdCompare => 'আইডি কার্ডের সাথে মেলান — শেষ ৪টি';

  @override
  String get visOpenVisit => 'ভিজিট খুলুন';
}
