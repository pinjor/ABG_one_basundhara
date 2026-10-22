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
  String get incModuleTitle => 'ঘটনা ও সুবিধা-সংক্রান্ত সমস্যা';

  @override
  String get incReport => 'ঘটনা বা সমস্যা জানান';

  @override
  String get incReportHint =>
      'নিরাপত্তা, সুবিধা, সিকিউরিটি বা আইটি সমস্যা? ছবি তুলুন — সংশ্লিষ্ট দল সঙ্গে সঙ্গে জানবে।';

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
  String incStepOf(int step, int total) {
    return 'ধাপ $step / $total';
  }

  @override
  String get incChooseGroup => 'কী ধরনের সমস্যা?';

  @override
  String get incChooseGroupHint =>
      'চারটি বিভাগের একটি বেছে নিন। পরের ধাপে নির্দিষ্ট সমস্যাটি বাছবেন।';

  @override
  String get incChooseCategory => 'কোনটি সবচেয়ে মানানসই?';

  @override
  String get incChangeGroup => 'পরিবর্তন';

  @override
  String get incTitleLabel => 'শিরোনাম';

  @override
  String get incTitleHint => 'যেমন: বয়লার রুমের কাছে গ্যাসের তীব্র গন্ধ';

  @override
  String get incDescriptionLabel => 'আপনি কী দেখেছেন? (ঐচ্ছিক)';

  @override
  String get incPhotos => 'ছবি';

  @override
  String get incPhotosHint =>
      'সর্বোচ্চ ৩টি ছবি যোগ করুন। পরিষ্কার ছবি দ্রুত ব্যবস্থা নিতে সাহায্য করে।';

  @override
  String incPhotoCount(int count, int max) {
    return '$maxটির মধ্যে $countটি যোগ হয়েছে';
  }

  @override
  String incPhotoPreview(int number) {
    return 'ছবি $number';
  }

  @override
  String get incTakePhoto => 'ছবি তুলুন';

  @override
  String get incChoosePhoto => 'গ্যালারি';

  @override
  String get incRemovePhoto => 'ছবি সরান';

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
  String get incSeverity => 'গুরুত্ব';

  @override
  String get incPrivacy => 'গোপনীয়তা';

  @override
  String get incConfidential => 'গোপনীয় রিপোর্ট';

  @override
  String get incConfidentialHint =>
      'শুধু প্রধান কার্যালয়ে যায় — কখনো আপনার অফিসের অ্যাডমিনদের কাছে নয় — এবং যাঁরা এটি দেখবেন তাঁদের কাছে আপনার নাম গোপন থাকে।';

  @override
  String get incConfidentialForced =>
      'অসদাচরণের রিপোর্ট সবসময় গোপনীয় এবং শুধু প্রধান কার্যালয়ে যায়।';

  @override
  String get incAnonymous => 'নাম গোপন রেখে জানান';

  @override
  String get incAnonymousHint =>
      'আপনার অফিসের অ্যাডমিনরাই এটি দেখবেন, তবে আপনার নাম দেখবেন না। শুধু আপনি অগ্রগতি দেখতে পারবেন বলে এটি সংরক্ষিত থাকে।';

  @override
  String get incSubmit => 'রিপোর্ট জমা দিন';

  @override
  String incSubmitted(Object ref) {
    return 'রিপোর্ট $ref পাঠানো হয়েছে। সংশ্লিষ্ট দলকে জানানো হয়েছে।';
  }

  @override
  String get incTitleRequired => 'একটি ছোট শিরোনাম দিন (অন্তত ৩ অক্ষর)';

  @override
  String get incCategoryRequired => 'সমস্যার ধরন বেছে নিন';

  @override
  String get incOfflineNotice =>
      'আপনি অফলাইনে আছেন। ছবিসহ রিপোর্টের জন্য সংযোগ প্রয়োজন — অনলাইনে ফিরে আবার চেষ্টা করুন।';

  @override
  String get incGrpSAFETY_INDUSTRIAL => 'নিরাপত্তা ও শিল্প';

  @override
  String get incGrpADMIN_FACILITY => 'প্রশাসন ও সুবিধা';

  @override
  String get incGrpSECURITY => 'সিকিউরিটি';

  @override
  String get incGrpIT_TECHNICAL => 'আইটি / কারিগরি';

  @override
  String get incGrpHintSAFETY_INDUSTRIAL =>
      'আগুন, গ্যাস, রাসায়নিক, আঘাত, বৈদ্যুতিক, যন্ত্রপাতি, পিপিই';

  @override
  String get incGrpHintADMIN_FACILITY =>
      'ভবন, পরিচ্ছন্নতা, ক্যাফেটেরিয়া, ওয়াশরুম, পানি, এসি, আসবাব';

  @override
  String get incGrpHintSECURITY =>
      'প্রবেশ, চুরি, সিসিটিভি, গেট ও তালা, অসদাচরণ';

  @override
  String get incGrpHintIT_TECHNICAL =>
      'নেটওয়ার্ক, কম্পিউটার, সফটওয়্যার, ফোন, বিদ্যুৎ ও ইউপিএস';

  @override
  String get incCatFIRE_HAZARD => 'আগুনের ঝুঁকি';

  @override
  String get incCatGAS_LEAK => 'গ্যাস লিক';

  @override
  String get incCatCHEMICAL_SPILL => 'রাসায়নিক ছড়িয়ে পড়া';

  @override
  String get incCatINJURY_NEAR_MISS => 'আঘাত বা অল্পের জন্য রক্ষা';

  @override
  String get incCatELECTRICAL_HAZARD => 'বৈদ্যুতিক ঝুঁকি';

  @override
  String get incCatMACHINERY_FAULT => 'যন্ত্রপাতির ত্রুটি';

  @override
  String get incCatPPE_VIOLATION => 'পিপিই না পরা';

  @override
  String get incCatSAFETY_HAZARD => 'অন্যান্য নিরাপত্তা ঝুঁকি';

  @override
  String get incCatBUILDING_DAMAGE => 'ভবনের ক্ষতি';

  @override
  String get incCatCLEANLINESS => 'পরিচ্ছন্নতা';

  @override
  String get incCatCAFETERIA_HYGIENE => 'ক্যাফেটেরিয়ার স্বাস্থ্যবিধি';

  @override
  String get incCatWASHROOM => 'ওয়াশরুম';

  @override
  String get incCatWATER_SUPPLY => 'পানি সরবরাহ';

  @override
  String get incCatAC_VENTILATION => 'এসি ও বায়ু চলাচল';

  @override
  String get incCatFURNITURE_FIXTURES => 'আসবাব ও ফিটিংস';

  @override
  String get incCatPEST_CONTROL => 'কীটপতঙ্গ দমন';

  @override
  String get incCatOTHER => 'অন্যান্য সুবিধা-সংক্রান্ত সমস্যা';

  @override
  String get incCatUNAUTHORISED_ACCESS => 'অননুমোদিত প্রবেশ';

  @override
  String get incCatTHEFT_LOSS => 'চুরি বা হারানো';

  @override
  String get incCatCCTV_FAULT => 'সিসিটিভি ত্রুটি';

  @override
  String get incCatGATE_LOCK => 'গেট বা তালা';

  @override
  String get incCatMISCONDUCT => 'অসদাচরণ';

  @override
  String get incCatNETWORK_DOWN => 'নেটওয়ার্ক বন্ধ';

  @override
  String get incCatCOMPUTER_PRINTER => 'কম্পিউটার বা প্রিন্টার';

  @override
  String get incCatSOFTWARE_ACCESS => 'সফটওয়্যার বা অ্যাক্সেস';

  @override
  String get incCatTELEPHONE => 'টেলিফোন / পিএবিএক্স';

  @override
  String get incCatPOWER_UPS => 'বিদ্যুৎ বা ইউপিএস';

  @override
  String get incCatHintFIRE_HAZARD =>
      'ধোঁয়া, স্ফুলিঙ্গ, বন্ধ ফায়ার এক্সিট, অগ্নিনির্বাপক নেই বা মেয়াদোত্তীর্ণ';

  @override
  String get incCatHintGAS_LEAK =>
      'গ্যাসের গন্ধ, পাইপ বা সিলিন্ডারে হিস শব্দ, ত্রুটিপূর্ণ গ্যাস লাইন';

  @override
  String get incCatHintCHEMICAL_SPILL =>
      'রাসায়নিক, রং, তেল বা জ্বালানি ছড়িয়ে বা চুইয়ে পড়ছে';

  @override
  String get incCatHintINJURY_NEAR_MISS =>
      'কাজের সময় কেউ আহত হয়েছেন, বা প্রায় হতে যাচ্ছিলেন';

  @override
  String get incCatHintELECTRICAL_HAZARD =>
      'খোলা তার, স্ফুলিঙ্গ ছড়ানো সকেট, অতিরিক্ত লোড বা খোলা সুইচবোর্ড';

  @override
  String get incCatHintMACHINERY_FAULT =>
      'অনিরাপদ বা নষ্ট মেশিন, গার্ড নেই, অস্বাভাবিক শব্দ বা ধোঁয়া';

  @override
  String get incCatHintPPE_VIOLATION =>
      'হেলমেট, গ্লাভস, মাস্ক বা হারনেস পরা হচ্ছে না বা নেই';

  @override
  String get incCatHintSAFETY_HAZARD =>
      'ভেজা মেঝে, হোঁচট খাওয়ার ঝুঁকি, বন্ধ চলার পথ, অনিরাপদ উচ্চতা';

  @override
  String get incCatHintBUILDING_DAMAGE =>
      'দেয়াল বা ছাদে ফাটল বা খসে পড়া, পানি চুঁইয়ে পড়া, ভাঙা দরজা-জানালা';

  @override
  String get incCatHintCLEANLINESS =>
      'নোংরা মেঝে, করিডোর ও সিঁড়ি, উপচে পড়া ময়লার ঝুড়ি';

  @override
  String get incCatHintCAFETERIA_HYGIENE =>
      'অপরিষ্কার রান্নাঘর বা পরিবেশনের জায়গা, খাদ্য নিরাপত্তা';

  @override
  String get incCatHintWASHROOM =>
      'অপরিষ্কার ওয়াশরুম, সাবান বা টিস্যু নেই, ড্রেন বন্ধ';

  @override
  String get incCatHintWATER_SUPPLY =>
      'পানি নেই, চাপ কম, ময়লা বা অনিরাপদ খাবার পানি';

  @override
  String get incCatHintAC_VENTILATION =>
      'এসি ঠান্ডা করছে না বা পানি পড়ছে, ফ্যান চলছে না, গুমোট ঘর';

  @override
  String get incCatHintFURNITURE_FIXTURES =>
      'ভাঙা চেয়ার, টেবিল বা আলমারি, বাতি বা ফিটিংস';

  @override
  String get incCatHintPEST_CONTROL => 'ইঁদুর, তেলাপোকা, মশা বা উইপোকা';

  @override
  String get incCatHintOTHER => 'অ্যাডমিন দলের দেখা উচিত এমন অন্য যেকোনো কিছু';

  @override
  String get incCatHintUNAUTHORISED_ACCESS =>
      'অপরিচিত ব্যক্তি ভেতরে, পেছন পেছন ঢোকা, আইডি কার্ডের অপব্যবহার';

  @override
  String get incCatHintTHEFT_LOSS =>
      'যন্ত্রপাতি, মালামাল, কাগজপত্র বা ব্যক্তিগত জিনিস পাওয়া যাচ্ছে না';

  @override
  String get incCatHintCCTV_FAULT =>
      'ক্যামেরা বন্ধ, ক্যামেরার আড়ালের জায়গা, রেকর্ডার কাজ করছে না';

  @override
  String get incCatHintGATE_LOCK =>
      'পাহারাবিহীন গেট, ভাঙা তালা, নষ্ট ব্যারিয়ার বা প্রবেশদ্বার';

  @override
  String get incCatHintMISCONDUCT =>
      'হয়রানি, ঘুষ, প্রতারণা বা অন্য অন্যায় — সবসময় গোপনীয়';

  @override
  String get incCatHintNETWORK_DOWN =>
      'ইন্টারনেট, ওয়াই-ফাই বা ল্যান নেই, খুব ধীর সংযোগ';

  @override
  String get incCatHintCOMPUTER_PRINTER =>
      'পিসি, ল্যাপটপ, প্রিন্টার বা স্ক্যানার কাজ করছে না';

  @override
  String get incCatHintSOFTWARE_ACCESS =>
      'ইআরপি, ইমেইল বা অ্যাপে সমস্যা, পাসওয়ার্ড বা অনুমতির সমস্যা';

  @override
  String get incCatHintTELEPHONE =>
      'ডেস্ক ফোন, পিএবিএক্স বা ইন্টারকম কাজ করছে না';

  @override
  String get incCatHintPOWER_UPS =>
      'বিদ্যুৎ নেই, ইউপিএস বা জেনারেটর বিকল, ভোল্টেজের সমস্যা';

  @override
  String get incSevCRITICAL => 'সংকটপূর্ণ';

  @override
  String get incSevHIGH => 'উচ্চ';

  @override
  String get incSevMEDIUM => 'মাঝারি';

  @override
  String get incSevLOW => 'কম';

  @override
  String get incSevHintCRITICAL =>
      'মানুষের বিপদ, বা কাজ বন্ধ হয়ে গেছে — এখনই ব্যবস্থা দরকার';

  @override
  String get incSevHintHIGH => 'গুরুতর; আজই ব্যবস্থা দরকার';

  @override
  String get incSevHintMEDIUM => 'শিগগির ঠিক করা দরকার';

  @override
  String get incSevHintLOW => 'সামান্য; সুবিধামতো ঠিক করলেই হবে';

  @override
  String get incStatusREPORTED => 'জানানো হয়েছে';

  @override
  String get incStatusACKNOWLEDGED => 'গ্রহণ করা হয়েছে';

  @override
  String get incStatusUNDER_INVESTIGATION => 'তদন্তাধীন';

  @override
  String get incStatusCLOSED => 'বন্ধ';

  @override
  String get incProgress => 'অগ্রগতি';

  @override
  String get incStageSkipped => 'বাদ পড়েছে';

  @override
  String get incStageNow => 'এখন';

  @override
  String get incWaitingForAdmin => 'দলের গ্রহণ করার অপেক্ষায়।';

  @override
  String get incResRESOLVED => 'সমাধান হয়েছে';

  @override
  String get incResNO_ACTION_NEEDED => 'ব্যবস্থার প্রয়োজন নেই';

  @override
  String get incResDUPLICATE => 'আগেই জানানো';

  @override
  String get incResREFERRED => 'অন্যত্র পাঠানো হয়েছে';

  @override
  String get incResHintRESOLVED => 'সমস্যাটি ঠিক করা হয়েছে।';

  @override
  String get incResHintNO_ACTION_NEEDED =>
      'দল যাচাই করেছে; কিছু করার প্রয়োজন নেই।';

  @override
  String get incResHintDUPLICATE =>
      'এটি আগেই জানানো হয়েছে এবং সেই রিপোর্টেই দেখা হচ্ছে।';

  @override
  String get incResHintREFERRED =>
      'এটি অন্য কর্তৃপক্ষ বা বিভাগের কাছে পাঠানো হয়েছে।';

  @override
  String get incResolution => 'সমাধানের ধরন';

  @override
  String incClosedAs(Object resolution) {
    return 'বন্ধ: $resolution';
  }

  @override
  String get incFilterAll => 'সব';

  @override
  String get incFilterOpen => 'চলমান';

  @override
  String get incNoReports => 'এখনো কোনো রিপোর্ট নেই';

  @override
  String get incNoReportsHint =>
      'কোনো সমস্যা জানালে এখানে এর প্রতিটি ধাপ দেখতে পারবেন।';

  @override
  String get incNoReportsFilter => 'এই ধাপে কোনো রিপোর্ট নেই।';

  @override
  String get incAdminUpdate => 'দলের আপডেট';

  @override
  String get incReportedBy => 'রিপোর্টকারী';

  @override
  String get incReportedOn => 'জানানো হয়েছে';

  @override
  String get incAnonymousBadge => 'নাম গোপন';

  @override
  String get incConfidentialBadge => 'গোপনীয়';

  @override
  String get incConfidentialDetail =>
      'গোপনীয়: শুধু প্রধান কার্যালয় এটি দেখে। যাঁরা এটি দেখছেন তাঁদের কাছে আপনার নাম গোপন।';

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
  String get incEvAcknowledged => 'গ্রহণ করা হয়েছে';

  @override
  String get incEvInvestigation => 'তদন্ত শুরু হয়েছে';

  @override
  String incEvClosed(Object resolution) {
    return 'বন্ধ — $resolution';
  }

  @override
  String get incEvReopened => 'পুনরায় খোলা হয়েছে';

  @override
  String get incEvNote => 'আপনার জন্য আপডেট';

  @override
  String get incEvPhoto => 'ছবি যোগ হয়েছে';

  @override
  String get incEvDetails => 'বিবরণ হালনাগাদ হয়েছে';
}
