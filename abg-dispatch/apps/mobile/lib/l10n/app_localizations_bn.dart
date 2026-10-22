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
  String get apprTitle => 'অনুমোদন';

  @override
  String get apprEmpty => 'আপনার জন্য কিছু অপেক্ষমাণ নেই';

  @override
  String get apprEmptyHint =>
      'আপনার অনুমোদন প্রয়োজন এমন ট্যুর ও পুল কার অনুরোধ এখানে দেখাবে।';

  @override
  String get apprAll => 'সব';

  @override
  String get apprTours => 'অফিসিয়াল ট্যুর';

  @override
  String get apprPoolCar => 'পুল কার';

  @override
  String get apprApprove => 'অনুমোদন';

  @override
  String get apprReject => 'প্রত্যাখ্যান';

  @override
  String get apprRejectTitle => 'এই অনুরোধ প্রত্যাখ্যান করবেন?';

  @override
  String get apprRejectReason => 'কারণ (অনুরোধকারী দেখবেন)';

  @override
  String get apprApproveTitle => 'এই অনুরোধ অনুমোদন করবেন?';

  @override
  String get apprNote => 'মন্তব্য (ঐচ্ছিক)';

  @override
  String get apprApproved => 'অনুমোদিত — অনুরোধকারীকে জানানো হয়েছে।';

  @override
  String get apprRejected => 'প্রত্যাখ্যাত — অনুরোধকারীকে জানানো হয়েছে।';

  @override
  String get apprAwaitingHOD => 'বিভাগীয় প্রধান হিসেবে আপনার অনুমোদন';

  @override
  String get apprAwaitingVETTING => 'এইচআর ও ফাইন্যান্স যাচাই';

  @override
  String get apprAwaitingSANCTION => 'এমডি / চেয়ারম্যানের অনুমোদন';

  @override
  String get apprForeign => 'বিদেশ';

  @override
  String get apprLocal => 'দেশে';

  @override
  String get apprUrgent => 'জরুরি';

  @override
  String apprPassengers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count জন যাত্রী',
    );
    return '$_temp0';
  }

  @override
  String apprBudget(Object amount) {
    return 'বাজেট ৳$amount';
  }

  @override
  String apprRequestedBy(Object name) {
    return 'অনুরোধকারী $name';
  }

  @override
  String get apprDetails => 'বিস্তারিত';

  @override
  String get navMyAbg => 'আমার ABG';

  @override
  String get navQrScan => 'QR স্ক্যান';

  @override
  String get navInbox => 'ইনবক্স';

  @override
  String get homeSeeMore => 'আরো দেখুন';

  @override
  String get homeSeeLess => 'কম দেখুন';

  @override
  String get homeSearchTooltip => 'সেবা খুঁজুন';

  @override
  String get homeSearchHint => 'সেবা খুঁজুন, যেমন পুল কার';

  @override
  String homeSearchEmpty(Object query) {
    return '“$query” এর সাথে কোনো সেবা মেলেনি';
  }

  @override
  String get homeSearchParcels => 'ট্র্যাকিং আইডি দিয়ে পার্সেল খুঁজুন';

  @override
  String get homeMenuTooltip => 'আমার ABG';

  @override
  String get homeGlance => 'এক নজরে';

  @override
  String get homeParcelsSection => 'পার্সেল';

  @override
  String get svcSendParcel => 'পার্সেল পাঠান';

  @override
  String get svcMyParcels => 'আমার পার্সেল';

  @override
  String get svcPoolCar => 'পুল কার';

  @override
  String get svcReportIssue => 'সমস্যা জানান';

  @override
  String get svcVisitors => 'ভিজিটর';

  @override
  String get svcTours => 'ট্যুর আবেদন';

  @override
  String get svcNotices => 'নোটিশ বোর্ড';

  @override
  String get svcApprovals => 'অনুমোদন';

  @override
  String get svcScan => 'স্ক্যান ও গ্রহণ';

  @override
  String get svcMyReports => 'আমার রিপোর্ট';

  @override
  String get svcLicences => 'লাইসেন্স';

  @override
  String get svcMyTrips => 'আমার ট্রিপ';

  @override
  String get svcGateDesk => 'গেট ডেস্ক';

  @override
  String get glanceWaiting => 'অপেক্ষমাণ পার্সেল';

  @override
  String get glanceInTransit => 'পথে আছে';

  @override
  String get glanceApprovals => 'অনুমোদন বাকি';

  @override
  String get glanceReports => 'খোলা রিপোর্ট';

  @override
  String get glanceNotices => 'অপঠিত নোটিশ';

  @override
  String get bannerRead => 'পড়ুন';

  @override
  String get bannerUrgent => 'জরুরি';

  @override
  String get bannerPinned => 'পিন করা';

  @override
  String get bannerStart => 'শুরু করুন';

  @override
  String get homeChannelCHAIRMAN => 'চেয়ারম্যান';

  @override
  String get homeChannelMANAGING_DIRECTOR => 'ব্যবস্থাপনা পরিচালক';

  @override
  String get homeChannelHR => 'মানবসম্পদ';

  @override
  String get homeChannelADMINISTRATION => 'প্রশাসন';

  @override
  String get homeChannelCOMPLIANCE => 'কমপ্লায়েন্স';

  @override
  String get homeChannelIT => 'আইটি';

  @override
  String get promoCarTitle => 'অফিসের কাজে গাড়ি লাগবে?';

  @override
  String get promoCarBody =>
      'পুল কার অনুরোধ করুন — বিভাগীয় প্রধান এক ট্যাপে অনুমোদন দেবেন।';

  @override
  String get promoIssueTitle => 'অনিরাপদ বা নষ্ট কিছু দেখছেন?';

  @override
  String get promoIssueBody =>
      'ছবি তুলে জানিয়ে দিন। অ্যাডমিন দল সঙ্গে সঙ্গে জানবে।';

  @override
  String get promoVisitorTitle => 'অতিথি আসছেন?';

  @override
  String get promoVisitorBody => 'আসার আগেই গেট পাস পাঠান — গেটে অপেক্ষা নয়।';

  @override
  String get myRequests => 'আমার অনুরোধ';

  @override
  String get myTours => 'আমার ট্যুর আবেদন';

  @override
  String get myCars => 'আমার পুল কার অনুরোধ';

  @override
  String get myVisitors => 'আমার ভিজিটর';

  @override
  String get myApprovals => 'আমার অনুমোদনের অপেক্ষায়';

  @override
  String get licTitle => 'লাইসেন্স';

  @override
  String get licRegister => 'লাইসেন্স রেজিস্টার';

  @override
  String get licReadOnlyNote =>
      'পরিবর্তন কমপ্লায়েন্স টিম ABG ONE পোর্টালে করে।';

  @override
  String get licFilterAll => 'সব';

  @override
  String get licFilterEXPIRING => 'মেয়াদ শেষ হচ্ছে';

  @override
  String get licFilterDUE_SOON => 'নবায়নের সময়';

  @override
  String get licFilterEXPIRED => 'মেয়াদোত্তীর্ণ';

  @override
  String get licFilterRENEWAL_IN_PROGRESS => 'নবায়ন চলছে';

  @override
  String get licFilterVALID => 'বৈধ';

  @override
  String get licStateVALID => 'বৈধ';

  @override
  String get licStateDUE_SOON => 'নবায়নের সময় হয়েছে';

  @override
  String get licStateEXPIRING => 'মেয়াদ শেষ হচ্ছে';

  @override
  String get licStateEXPIRED => 'মেয়াদোত্তীর্ণ';

  @override
  String get licRetired => 'ব্যবহার বন্ধ';

  @override
  String get licRetiredNotice =>
      'রেজিস্টার থেকে বাদ দেওয়া হয়েছে — কোনো সতর্কবার্তা পাঠানো হয় না।';

  @override
  String licDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count দিন বাকি',
      one: '১ দিন বাকি',
    );
    return '$_temp0';
  }

  @override
  String get licExpiresToday => 'আজ মেয়াদ শেষ';

  @override
  String licExpiredAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count দিন আগে মেয়াদ শেষ',
      one: '১ দিন আগে মেয়াদ শেষ',
    );
    return '$_temp0';
  }

  @override
  String licCaptionLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'দিন বাকি',
      one: 'দিন বাকি',
    );
    return '$_temp0';
  }

  @override
  String licCaptionOverdue(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'দিন পেরিয়েছে',
      one: 'দিন পেরিয়েছে',
    );
    return '$_temp0';
  }

  @override
  String get licCaptionToday => 'মেয়াদের শেষ দিন';

  @override
  String get licToday => 'আজ';

  @override
  String get licWithin30 => '≤ ৩০ দিন';

  @override
  String get licNextToExpire => 'পরবর্তী মেয়াদ শেষ';

  @override
  String get licNoLicences => 'এখানে কোনো লাইসেন্স নেই';

  @override
  String get licNoLicencesHint =>
      'অন্য ফিল্টার বেছে নিন। আপনার দায়িত্বের অফিসগুলোর লাইসেন্স এখানে দেখা যাবে।';

  @override
  String get licRenewal => 'নবায়ন';

  @override
  String get licRenewalProgress => 'নবায়নের অগ্রগতি';

  @override
  String get licStageNOT_STARTED => 'শুরু হয়নি';

  @override
  String get licStageDOCUMENTS_PREPARED => 'কাগজপত্র প্রস্তুত';

  @override
  String get licStageAPPLICATION_SUBMITTED => 'আবেদন জমা হয়েছে';

  @override
  String get licStageINSPECTION_SCHEDULED => 'পরিদর্শন নির্ধারিত';

  @override
  String get licStageFEE_PAID => 'ফি পরিশোধিত';

  @override
  String get licStageRENEWED => 'নবায়িত';

  @override
  String licStartedOn(Object date) {
    return 'শুরু $date';
  }

  @override
  String licNotStartedHint(Object date) {
    return 'নবায়ন এখনো শুরু হয়নি। নবায়নের সময় শুরু $date।';
  }

  @override
  String licWindowOpenHint(Object date) {
    return 'নবায়ন এখনো শুরু হয়নি। নবায়নের সময় শুরু হয়েছে $date।';
  }

  @override
  String get licNextStep => 'পরবর্তী';

  @override
  String get licCatTRADE => 'ট্রেড লাইসেন্স';

  @override
  String get licCatFACTORY => 'কারখানা লাইসেন্স';

  @override
  String get licCatENVIRONMENT => 'পরিবেশ ছাড়পত্র';

  @override
  String get licCatFIRE_SAFETY => 'অগ্নি নিরাপত্তা';

  @override
  String get licCatENERGY_REGULATORY => 'জ্বালানি নিয়ন্ত্রণ (বিইআরসি)';

  @override
  String get licCatEXPLOSIVES => 'বিস্ফোরক / এলপিজি মজুত';

  @override
  String get licCatBOILER => 'বয়লার সনদ';

  @override
  String get licCatIMPORT_EXPORT => 'আমদানি / রপ্তানি (আইআরসি / ইআরসি)';

  @override
  String get licCatSTANDARDS => 'মান সনদ (বিএসটিআই)';

  @override
  String get licCatOTHER => 'অন্যান্য';

  @override
  String get licDetails => 'বিস্তারিত';

  @override
  String get licNumber => 'লাইসেন্স নম্বর';

  @override
  String get licKind => 'লাইসেন্সের ধরন';

  @override
  String get licAuthority => 'ইস্যুকারী কর্তৃপক্ষ';

  @override
  String get licOffice => 'অফিস';

  @override
  String get licOwner => 'দায়িত্বপ্রাপ্ত ব্যক্তি';

  @override
  String get licNoOwner =>
      'নির্ধারিত নয় — সতর্কবার্তা কমপ্লায়েন্স টিমের কাছে যায়';

  @override
  String get licIssuedOn => 'ইস্যুর তারিখ';

  @override
  String get licExpiresOn => 'মেয়াদ শেষের তারিখ';

  @override
  String get licExpiredOn => 'মেয়াদ শেষ হয়েছে';

  @override
  String get licWindow => 'নবায়নের সময়সীমা';

  @override
  String licWindowValue(int days) {
    return 'মেয়াদ শেষের $days দিন আগে';
  }

  @override
  String get licFee => 'নবায়ন ফি';

  @override
  String licFeeValue(Object amount) {
    return '$amount টাকা';
  }

  @override
  String get licNotes => 'নোট';

  @override
  String licNextAlert(Object date) {
    return 'পরবর্তী সতর্কবার্তা $date';
  }

  @override
  String get licAllAlertsSent => 'এই মেয়াদের সব সতর্কবার্তা পাঠানো হয়েছে।';

  @override
  String get licScan => 'স্ক্যান কপি';

  @override
  String get licViewScan => 'স্ক্যান কপি দেখুন';

  @override
  String get licNoScan => 'এখনো কোনো স্ক্যান কপি নেই।';

  @override
  String get licPdf => 'পিডিএফ ডকুমেন্ট';

  @override
  String get licImage => 'ছবি';

  @override
  String get licOpenFailed =>
      'ডকুমেন্টটি খোলা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।';

  @override
  String get licHistory => 'ইতিহাস';

  @override
  String get licEvCreated => 'রেজিস্টারে যোগ হয়েছে';

  @override
  String get licEvDetails => 'বিস্তারিত পরিবর্তন হয়েছে';

  @override
  String get licEvRetired => 'রেজিস্টার থেকে বাদ দেওয়া হয়েছে';

  @override
  String get licEvRestored => 'আবার ব্যবহারে';

  @override
  String licEvStage(Object stage) {
    return 'নবায়ন এখন: $stage';
  }

  @override
  String licEvStageBack(Object stage) {
    return 'নবায়ন ফিরে গেছে: $stage';
  }

  @override
  String licEvRenewed(Object date) {
    return '$date পর্যন্ত নবায়িত';
  }

  @override
  String get licEvDocument => 'স্ক্যান কপি আপলোড হয়েছে';

  @override
  String licEvAlert(int days) {
    return 'মেয়াদ সতর্কবার্তা: $days দিন আগে';
  }

  @override
  String get licEvAlertDay => 'মেয়াদ সতর্কবার্তা: মেয়াদের শেষ দিন';

  @override
  String get licEvNote => 'নোট';

  @override
  String licEvNotified(Object names) {
    return 'পাঠানো হয়েছে: $names';
  }

  @override
  String get nbTitle => 'নোটিশ বোর্ড';

  @override
  String get nbSubtitle =>
      'চেয়ারম্যান, এমডি, মানবসম্পদ ও প্রশাসনের অফিশিয়াল নোটিশ';

  @override
  String get nbFilterAll => 'সব';

  @override
  String get nbFilterUnread => 'অপঠিত';

  @override
  String get nbChannelCHAIRMAN => 'চেয়ারম্যান';

  @override
  String get nbChannelMANAGING_DIRECTOR => 'ব্যবস্থাপনা পরিচালক';

  @override
  String get nbChannelHR => 'মানবসম্পদ';

  @override
  String get nbChannelADMINISTRATION => 'প্রশাসন';

  @override
  String get nbChannelCOMPLIANCE => 'কমপ্লায়েন্স';

  @override
  String get nbChannelIT => 'আইটি';

  @override
  String get nbCatGENERAL => 'সাধারণ';

  @override
  String get nbCatCIRCULAR => 'সার্কুলার';

  @override
  String get nbCatPOLICY => 'নীতিমালা';

  @override
  String get nbCatHR => 'মানবসম্পদ';

  @override
  String get nbCatSAFETY => 'নিরাপত্তা';

  @override
  String get nbCatEVENT => 'অনুষ্ঠান';

  @override
  String get nbCatHOLIDAY => 'ছুটি';

  @override
  String get nbUrgent => 'জরুরি';

  @override
  String get nbPinned => 'পিন করা';

  @override
  String get nbNew => 'নতুন';

  @override
  String get nbAcknowledged => 'স্বীকৃত';

  @override
  String get nbAckNeeded => 'স্বীকৃতি দিন';

  @override
  String get nbHasPdf => 'PDF সংযুক্ত';

  @override
  String nbUnreadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি অপঠিত নোটিশ',
      one: '১টি অপঠিত নোটিশ',
      zero: 'সব পড়া হয়েছে',
    );
    return '$_temp0';
  }

  @override
  String nbToAckCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি আপনার স্বীকৃতির অপেক্ষায়',
      one: '১টি আপনার স্বীকৃতির অপেক্ষায়',
    );
    return '$_temp0';
  }

  @override
  String get nbEmpty => 'এখানে কোনো নোটিশ নেই';

  @override
  String get nbEmptyHint =>
      'আপনার জন্য পাঠানো নোটিশ এখানে দেখাবে, জরুরিগুলো আগে।';

  @override
  String get nbEmptyUnreadHint => 'বোর্ডের সব নোটিশ আপনি পড়েছেন।';

  @override
  String get nbShowAll => 'সব নোটিশ দেখুন';

  @override
  String nbFromOffice(Object channel) {
    return '$channel দপ্তর থেকে';
  }

  @override
  String get nbUrgentBanner => 'জরুরি নোটিশ — এখনই পড়ুন';

  @override
  String get nbPublished => 'প্রকাশিত';

  @override
  String get nbAudience => 'প্রাপক';

  @override
  String get nbAudienceAll => 'গ্রুপের সবাই';

  @override
  String get nbOnBoardUntil => 'বোর্ডে থাকবে';

  @override
  String get nbExpired => 'এই নোটিশের মেয়াদ শেষ হয়েছে।';

  @override
  String get nbArchived => 'এই নোটিশ বোর্ড থেকে সরানো হয়েছে।';

  @override
  String get nbSignedBy => 'স্বাক্ষরকারী';

  @override
  String get nbAttachment => 'সংযুক্ত নথি';

  @override
  String get nbOpenPdf => 'PDF খুলুন';

  @override
  String get nbPdfHint => 'আপনার ফোনের PDF ভিউয়ারে খুলবে';

  @override
  String get nbPdfFailed => 'PDF খোলা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।';

  @override
  String get nbAckPrompt =>
      'প্রেরক আপনাকে নিশ্চিত করতে বলেছেন যে আপনি নোটিশটি পড়েছেন ও বুঝেছেন।';

  @override
  String get nbAckButton => 'আমি পড়েছি ও বুঝেছি';

  @override
  String get nbAckTitle => 'নোটিশটি স্বীকার করুন';

  @override
  String get nbAckBody =>
      'আপনি নিশ্চিত করছেন যে নোটিশটি পড়েছেন ও বুঝেছেন। প্রেরকের জন্য আপনার নাম ও সময় রেকর্ড হবে।';

  @override
  String get nbAckConfirm => 'নিশ্চিত করুন';

  @override
  String get nbAckDone => 'ধন্যবাদ — আপনার স্বীকৃতি রেকর্ড হয়েছে।';

  @override
  String nbAckedOn(Object time) {
    return 'আপনি নোটিশটি স্বীকার করেছেন · $time';
  }

  @override
  String get nbAckExpired =>
      'মেয়াদ শেষ হওয়ায় এই নোটিশ আর স্বীকার করা যাবে না।';

  @override
  String get nbNoAckNeeded => 'আপনার অবগতির জন্য — স্বীকৃতির প্রয়োজন নেই।';

  @override
  String get nbAuthorNote =>
      'আপনি এই নোটিশ প্রকাশ করেছেন। কে পড়েছেন তা অ্যাডমিন পোর্টালে দেখুন।';

  @override
  String get tourTitle => 'অফিসিয়াল ট্যুর';

  @override
  String get tourApply => 'ট্যুরের আবেদন করুন';

  @override
  String get tourMyRequests => 'আমার আবেদন';

  @override
  String get tourToApprove => 'অনুমোদনের জন্য';

  @override
  String get tourFilterAll => 'সব';

  @override
  String get tourFilterOpen => 'চলমান';

  @override
  String get tourFilterClosed => 'বন্ধ';

  @override
  String get tourNoRequests => 'এখনো কোনো ট্যুরের আবেদন নেই';

  @override
  String get tourNoRequestsHint =>
      'দেশে বা বিদেশে ট্যুরের আবেদন করুন এবং প্রতিটি অনুমোদন এখানে দেখুন।';

  @override
  String get tourNothingToApprove =>
      'আপনার সিদ্ধান্তের জন্য কিছু অপেক্ষমাণ নেই';

  @override
  String get tourNothingToApproveHint =>
      'যেসব আবেদন আপনাকে অনুমোদন, যাচাই বা মঞ্জুর করতে হবে সেগুলো এখানে দেখাবে।';

  @override
  String tourWaitingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি আবেদন আপনার অপেক্ষায়',
      one: '১টি আবেদন আপনার অপেক্ষায়',
    );
    return '$_temp0';
  }

  @override
  String get tourYourDecision => 'আপনার সিদ্ধান্ত';

  @override
  String get tourReview => 'দেখুন';

  @override
  String tourSanctioned(Object amount) {
    return 'মঞ্জুর $amount';
  }

  @override
  String get tourStatusPENDING_HOD => 'বিভাগীয় প্রধানের অনুমোদনের অপেক্ষায়';

  @override
  String get tourStatusPENDING_VETTING => 'এইচআর ও ফাইন্যান্স যাচাই';

  @override
  String get tourStatusPENDING_SANCTION => 'এমডি / চেয়ারম্যানের মঞ্জুরি';

  @override
  String get tourStatusAPPROVED => 'অনুমোদিত ও অর্থ মঞ্জুর';

  @override
  String get tourStatusACTIVE => 'ট্যুর চলছে';

  @override
  String get tourStatusCOMPLETED => 'সম্পন্ন';

  @override
  String get tourStatusREJECTED => 'প্রত্যাখ্যাত';

  @override
  String get tourStatusCANCELLED => 'বাতিল';

  @override
  String get tourTypeLOCAL => 'দেশীয়';

  @override
  String get tourTypeFOREIGN => 'বিদেশ';

  @override
  String get tourPurposeCONFERENCE => 'সম্মেলন';

  @override
  String get tourPurposeTECHNICAL_INSPECTION => 'কারিগরি পরিদর্শন';

  @override
  String get tourPurposeVENDOR_AUDIT => 'সরবরাহকারী নিরীক্ষা';

  @override
  String get tourPurposeTRAINING => 'প্রশিক্ষণ';

  @override
  String get tourPurposeCLIENT_MEETING => 'ক্লায়েন্ট মিটিং';

  @override
  String get tourPurposePLANT_VISIT => 'প্ল্যান্ট / সাইট পরিদর্শন';

  @override
  String get tourPurposeOTHER => 'অন্যান্য';

  @override
  String get tourTransportAIR => 'আকাশপথ';

  @override
  String get tourTransportROAD => 'সড়কপথ';

  @override
  String get tourTransportRAIL => 'রেলপথ';

  @override
  String get tourTransportWATER => 'নৌপথ';

  @override
  String get tourTransportPOOL_CAR => 'পুল কার';

  @override
  String get tourAwaitingHOD => 'বিভাগীয় প্রধান';

  @override
  String get tourAwaitingVETTING => 'এইচআর ও ফাইন্যান্স';

  @override
  String get tourAwaitingSANCTION => 'এমডি / চেয়ারম্যান';

  @override
  String tourDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count দিন',
      one: '১ দিন',
    );
    return '$_temp0';
  }

  @override
  String get tourPipeline => 'অনুমোদনের ধাপ';

  @override
  String get tourStageSUBMITTED => 'জমা হয়েছে';

  @override
  String get tourStagePENDING_HOD => 'বিভাগীয় প্রধানের অনুমোদন';

  @override
  String get tourStagePENDING_VETTING => 'এইচআর ও ফাইন্যান্স যাচাই';

  @override
  String get tourStagePENDING_SANCTION => 'এমডি / চেয়ারম্যানের মঞ্জুরি';

  @override
  String get tourStageAPPROVED => 'অর্থ মঞ্জুর';

  @override
  String get tourStageACTIVE => 'ট্যুরে';

  @override
  String get tourStageCOMPLETED => 'সম্পন্ন';

  @override
  String tourWaitingFor(Object name) {
    return '$name-এর অপেক্ষায়';
  }

  @override
  String tourStageRejectedBy(Object name) {
    return '$name প্রত্যাখ্যান করেছেন';
  }

  @override
  String get tourStageCancelled => 'ভ্রমণকারী বাতিল করেছেন';

  @override
  String get tourStageSkipped => 'এই ধাপে পৌঁছায়নি';

  @override
  String get tourStageInProgress => 'চলমান';

  @override
  String get tourFormIntro =>
      'প্রথমে আপনার বিভাগীয় প্রধান অনুমোদন দেবেন, তারপর এইচআর ও ফাইন্যান্স বাজেট যাচাই করবে। বিদেশ ট্যুরের জন্য এমডি বা চেয়ারম্যানের মঞ্জুরিও লাগবে।';

  @override
  String get tourWhere => 'কোথায় যাচ্ছেন?';

  @override
  String get tourLocalHint => 'বাংলাদেশের ভেতরে';

  @override
  String get tourForeignHint => 'বিদেশে · মঞ্জুরি লাগবে';

  @override
  String get tourPurposeLabel => 'উদ্দেশ্য';

  @override
  String get tourTitleLabel => 'শিরোনাম';

  @override
  String get tourTitleHint => 'যেমন: কম্প্রেসর সরবরাহকারী নিরীক্ষা';

  @override
  String get tourDestinationLabel => 'গন্তব্য';

  @override
  String get tourDestinationHint => 'যেমন: চট্টগ্রাম এলপিজি রিফাইনারি';

  @override
  String get tourCityLabel => 'শহর / সাইট';

  @override
  String get tourCountryLabel => 'দেশ';

  @override
  String get tourDatesLabel => 'ভ্রমণের তারিখ';

  @override
  String get tourPickDates => 'ভ্রমণের তারিখ বেছে নিন';

  @override
  String get tourTransportLabel => 'যাতায়াত';

  @override
  String get tourCoTravellers => 'সহযাত্রী';

  @override
  String get tourCoTravellerHint => 'একই ভ্রমণে থাকা সহকর্মীর নাম';

  @override
  String get tourCoTravellerAdd => 'সহযাত্রী যোগ করুন';

  @override
  String tourRemove(Object name) {
    return '$name সরান';
  }

  @override
  String get tourBudgetSection => 'বাজেট';

  @override
  String get tourEstimatedBudget => 'আনুমানিক বাজেট (৳)';

  @override
  String get tourBudgetHint => 'ভাড়া, হোটেল, দৈনিক ভাতা ও স্থানীয় যাতায়াত';

  @override
  String get tourAdvance => 'অগ্রিমের অনুরোধ (৳)';

  @override
  String get tourPassportSection => 'পাসপোর্ট';

  @override
  String get tourPassportNumber => 'পাসপোর্ট নম্বর';

  @override
  String get tourPassportExpiry => 'পাসপোর্টের মেয়াদ শেষের তারিখ';

  @override
  String get tourPassportWarning =>
      'ফেরার ৬ মাসের মধ্যে আপনার পাসপোর্টের মেয়াদ শেষ হচ্ছে। বেশিরভাগ দেশে ৬ মাসের মেয়াদ লাগে — এখনই নবায়ন শুরু করুন।';

  @override
  String get tourPassportExpired =>
      'ফেরার আগেই আপনার পাসপোর্টের মেয়াদ শেষ হচ্ছে। আবেদনের আগে নবায়ন করুন।';

  @override
  String get tourApprover => 'অনুমোদনকারী';

  @override
  String get tourApproverHint => 'প্রথমে আপনার বিভাগীয় প্রধান অনুমোদন দেবেন।';

  @override
  String get tourChange => 'পরিবর্তন';

  @override
  String get tourChooseApprover => 'অনুমোদনকারী বেছে নিন';

  @override
  String get tourNoManager =>
      'কোনো লাইন ম্যানেজার নেই — কে অনুমোদন দেবেন বেছে নিন।';

  @override
  String tourManagerNoAccount(Object name) {
    return '$name-এর ABG ONE অ্যাকাউন্ট নেই — অন্য কাউকে বেছে নিন।';
  }

  @override
  String get tourSearchPeople => 'নাম, আইডি বা পদবি দিয়ে খুঁজুন';

  @override
  String get tourNoAccount => 'অ্যাকাউন্ট নেই';

  @override
  String get tourDescriptionLabel => 'বিস্তারিত (ঐচ্ছিক)';

  @override
  String get tourDescriptionHint =>
      'কর্মসূচি, যাঁদের সঙ্গে দেখা করবেন, কোম্পানির লাভ';

  @override
  String get tourSubmit => 'আবেদন জমা দিন';

  @override
  String tourSubmitted(Object reference) {
    return '$reference অনুমোদনের জন্য পাঠানো হয়েছে';
  }

  @override
  String get tourErrTitle => 'ট্যুরের একটি ছোট শিরোনাম দিন।';

  @override
  String get tourErrDestination => 'কোথায় যাচ্ছেন লিখুন।';

  @override
  String get tourErrCountry => 'গন্তব্যের দেশ লিখুন।';

  @override
  String get tourErrDates => 'ভ্রমণের তারিখ বেছে নিন।';

  @override
  String get tourErrBudget => 'টাকায় আনুমানিক বাজেট লিখুন।';

  @override
  String get tourErrAdvance => 'অগ্রিম বাজেটের চেয়ে বেশি হতে পারে না।';

  @override
  String get tourErrPassport => 'পাসপোর্ট নম্বর ও মেয়াদ শেষের তারিখ লিখুন।';

  @override
  String get tourErrApprover => 'কে এই ট্যুর অনুমোদন দেবেন বেছে নিন।';

  @override
  String get tourOfflineNotice =>
      'আপনি অফলাইনে আছেন। ট্যুরের আবেদনের জন্য সংযোগ প্রয়োজন — অনলাইনে ফিরে আবার চেষ্টা করুন।';

  @override
  String get tourTrip => 'ভ্রমণ';

  @override
  String get tourDeparture => 'যাত্রা';

  @override
  String get tourReturn => 'ফেরা';

  @override
  String get tourDuration => 'মেয়াদ';

  @override
  String get tourOffice => 'অফিস';

  @override
  String get tourBudgetEstimated => 'আনুমানিক';

  @override
  String get tourBudgetAdvance => 'অগ্রিম';

  @override
  String get tourBudgetSanctioned => 'মঞ্জুরকৃত';

  @override
  String get tourNotYet => 'এখনো নয়';

  @override
  String get tourNone => 'নেই';

  @override
  String get tourTraveller => 'ভ্রমণকারী';

  @override
  String get tourHod => 'বিভাগীয় প্রধান';

  @override
  String get tourAlone => 'একা ভ্রমণ করছেন';

  @override
  String get tourValidUntil => 'মেয়াদ';

  @override
  String get tourHistory => 'ইতিহাস';

  @override
  String get tourPassportAlertTitle => 'পাসপোর্ট নবায়ন প্রয়োজন';

  @override
  String tourPassportAlertBody(Object expiry, Object end) {
    return 'মেয়াদ $expiry পর্যন্ত; ট্যুর শেষ $end। বেশিরভাগ দেশে ছয় মাসের মেয়াদ লাগে — বুকিংয়ের আগে নবায়ন করুন।';
  }

  @override
  String tourStartableFrom(Object date) {
    return 'অনুমোদিত ও অর্থ মঞ্জুর। $date থেকে ট্যুর শুরু করতে পারবেন।';
  }

  @override
  String get tourSeparation =>
      'আপনি বিভাগীয় প্রধান হিসেবে এটি অনুমোদন করেছেন, তাই এইচআর ও ফাইন্যান্সের অন্য একজনকে যাচাই করতে হবে।';

  @override
  String get tourLatestNote => 'সর্বশেষ নোট';

  @override
  String get tourActApprove => 'অনুমোদন';

  @override
  String get tourActVet => 'যাচাই করে পাঠান';

  @override
  String get tourActApproveSanction => 'অনুমোদন ও মঞ্জুর';

  @override
  String get tourActSanction => 'ট্যুর মঞ্জুর';

  @override
  String get tourActReject => 'প্রত্যাখ্যান';

  @override
  String get tourActStart => 'ট্যুর শুরু';

  @override
  String get tourActComplete => 'সম্পন্ন চিহ্নিত করুন';

  @override
  String get tourActCancel => 'আবেদন বাতিল';

  @override
  String get tourActNote => 'নোট যোগ করুন';

  @override
  String get tourApproveHod => 'বিভাগীয় প্রধান হিসেবে অনুমোদন';

  @override
  String get tourApproveHodHint =>
      'এরপর বাজেট যাচাইয়ের জন্য এইচআর ও ফাইন্যান্সে যাবে।';

  @override
  String get tourVetHint =>
      'মঞ্জুরির অঙ্ক নিশ্চিত করুন। এরপর এমডি / চেয়ারম্যানের কাছে যাবে।';

  @override
  String get tourVetLocalHint =>
      'এইচআর ও ফাইন্যান্সের অনুমোদনে দেশীয় ট্যুর চূড়ান্ত হয় এবং অর্থ মঞ্জুর হয়।';

  @override
  String get tourSanctionHint =>
      'আপনার মঞ্জুরিতে ট্যুর অনুমোদিত হবে এবং অর্থ ছাড় হবে।';

  @override
  String get tourRejectHint => 'কারণ লিখতে হবে — ভ্রমণকারী তা দেখবেন।';

  @override
  String get tourCancelHint => 'কারণ লিখতে হবে। যিনি দেখছেন তাঁকে জানানো হবে।';

  @override
  String get tourStartHint =>
      'আপনার বিভাগীয় প্রধানকে জানানো হবে যে আপনি রওনা দিয়েছেন।';

  @override
  String get tourCompleteHint =>
      'ট্যুর বন্ধ হবে। অগ্রিম থাকলে সমন্বয়ের জন্য এইচআর ও ফাইন্যান্সে যাবে।';

  @override
  String get tourNoteHint => 'ইতিহাসে থাকবে; অপর পক্ষকে জানানো হবে।';

  @override
  String get tourReason => 'কারণ';

  @override
  String get tourNoteOptional => 'নোট (ঐচ্ছিক)';

  @override
  String get tourNoteLabel => 'নোট';

  @override
  String get tourSanctionedBudget => 'মঞ্জুরকৃত বাজেট (৳)';

  @override
  String get tourReasonRequired => 'সংক্ষেপে কারণ লিখুন।';

  @override
  String get tourDoneApproved =>
      'অনুমোদিত — পরবর্তী অনুমোদনকারীকে জানানো হয়েছে।';

  @override
  String get tourDoneSanctioned =>
      'অনুমোদিত — অর্থ মঞ্জুর হয়েছে এবং ভ্রমণকারীকে জানানো হয়েছে।';

  @override
  String get tourDoneRejected =>
      'প্রত্যাখ্যাত — ভ্রমণকারীকে কারণ জানানো হয়েছে।';

  @override
  String get tourDoneStarted => 'ট্যুর শুরু হয়েছে। শুভ যাত্রা!';

  @override
  String get tourDoneCompleted => 'ট্যুর সম্পন্ন হিসেবে চিহ্নিত হয়েছে।';

  @override
  String get tourDoneCancelled => 'আবেদন বাতিল হয়েছে।';

  @override
  String get tourDoneNote => 'নোট যোগ হয়েছে।';

  @override
  String get tourEvSubmitted => 'আবেদন করা হয়েছে';

  @override
  String get tourEvHod => 'বিভাগীয় প্রধান অনুমোদন করেছেন';

  @override
  String get tourEvVetted => 'এইচআর ও ফাইন্যান্স যাচাই করেছে';

  @override
  String get tourEvApproved => 'অনুমোদিত ও অর্থ মঞ্জুর';

  @override
  String get tourEvSanctioned => 'এমডি / চেয়ারম্যান মঞ্জুর করেছেন';

  @override
  String get tourEvRejected => 'প্রত্যাখ্যাত';

  @override
  String get tourEvStarted => 'ট্যুর শুরু হয়েছে';

  @override
  String get tourEvCompleted => 'ট্যুর সম্পন্ন';

  @override
  String get tourEvCancelled => 'আবেদন বাতিল';

  @override
  String get tourEvNote => 'নোট';

  @override
  String tourEvBudget(Object amount) {
    return 'মঞ্জুরকৃত বাজেট $amount নির্ধারিত';
  }
}
