import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_bn.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of L
/// returned by `L.of(context)`.
///
/// Applications need to include `L.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: L.localizationsDelegates,
///   supportedLocales: L.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the L.supportedLocales
/// property.
abstract class L {
  L(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static L of(BuildContext context) {
    return Localizations.of<L>(context, L)!;
  }

  static const LocalizationsDelegate<L> delegate = _LDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('bn'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'ABG ONE'**
  String get appName;

  /// No description provided for @orgName.
  ///
  /// In en, this message translates to:
  /// **'Anvir Bashundhara Group'**
  String get orgName;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'One app for the whole group.'**
  String get tagline;

  /// No description provided for @splashLoading.
  ///
  /// In en, this message translates to:
  /// **'Securing your session'**
  String get splashLoading;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcomeBack;

  /// No description provided for @signInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your ABG email or employee ID.'**
  String get signInSubtitle;

  /// No description provided for @identifierLabel.
  ///
  /// In en, this message translates to:
  /// **'Email or employee ID'**
  String get identifierLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @authenticatorLabel.
  ///
  /// In en, this message translates to:
  /// **'Authenticator code'**
  String get authenticatorLabel;

  /// No description provided for @carrierEntry.
  ///
  /// In en, this message translates to:
  /// **'Carrying a parcel without an ABG account?'**
  String get carrierEntry;

  /// No description provided for @carrierEntryAction.
  ///
  /// In en, this message translates to:
  /// **'Carrier sign-in'**
  String get carrierEntryAction;

  /// No description provided for @securedFooter.
  ///
  /// In en, this message translates to:
  /// **'Secured access · Every action is logged'**
  String get securedFooter;

  /// No description provided for @guestTitle.
  ///
  /// In en, this message translates to:
  /// **'Carrier sign-in'**
  String get guestTitle;

  /// No description provided for @guestSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the mobile number dispatch registered for you. We will text you a 6-digit code.'**
  String get guestSubtitle;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get phoneLabel;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @codeLabel.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get codeLabel;

  /// No description provided for @verifyContinue.
  ///
  /// In en, this message translates to:
  /// **'Verify and continue'**
  String get verifyContinue;

  /// No description provided for @codeSentTo.
  ///
  /// In en, this message translates to:
  /// **'Code sent to {phone}'**
  String codeSentTo(Object phone);

  /// No description provided for @devCode.
  ///
  /// In en, this message translates to:
  /// **'Development code: {code}'**
  String devCode(Object code);

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning, {name}'**
  String greetingMorning(Object name);

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon, {name}'**
  String greetingAfternoon(Object name);

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening, {name}'**
  String greetingEvening(Object name);

  /// No description provided for @sendParcel.
  ///
  /// In en, this message translates to:
  /// **'Send a parcel'**
  String get sendParcel;

  /// No description provided for @sendParcelHint.
  ///
  /// In en, this message translates to:
  /// **'Book a document, instrument or package in under a minute'**
  String get sendParcelHint;

  /// No description provided for @myActivity.
  ///
  /// In en, this message translates to:
  /// **'My activity'**
  String get myActivity;

  /// No description provided for @inTransit.
  ///
  /// In en, this message translates to:
  /// **'In transit'**
  String get inTransit;

  /// No description provided for @waitingForMe.
  ///
  /// In en, this message translates to:
  /// **'Waiting for me'**
  String get waitingForMe;

  /// No description provided for @pendingPickup.
  ///
  /// In en, this message translates to:
  /// **'Pending pickup'**
  String get pendingPickup;

  /// No description provided for @assignedToMe.
  ///
  /// In en, this message translates to:
  /// **'Assigned to me'**
  String get assignedToMe;

  /// No description provided for @actionRequired.
  ///
  /// In en, this message translates to:
  /// **'Action required'**
  String get actionRequired;

  /// No description provided for @recentParcels.
  ///
  /// In en, this message translates to:
  /// **'Recent parcels'**
  String get recentParcels;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navParcels.
  ///
  /// In en, this message translates to:
  /// **'Parcels'**
  String get navParcels;

  /// No description provided for @navScan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get navScan;

  /// No description provided for @navAlerts.
  ///
  /// In en, this message translates to:
  /// **'Alerts'**
  String get navAlerts;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @tabIncoming.
  ///
  /// In en, this message translates to:
  /// **'Incoming'**
  String get tabIncoming;

  /// No description provided for @tabOutgoing.
  ///
  /// In en, this message translates to:
  /// **'Outgoing'**
  String get tabOutgoing;

  /// No description provided for @tabAssigned.
  ///
  /// In en, this message translates to:
  /// **'Carrying'**
  String get tabAssigned;

  /// No description provided for @tabCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get tabCompleted;

  /// No description provided for @searchParcels.
  ///
  /// In en, this message translates to:
  /// **'Search tracking ID, title or person'**
  String get searchParcels;

  /// No description provided for @noParcels.
  ///
  /// In en, this message translates to:
  /// **'No parcels here yet'**
  String get noParcels;

  /// No description provided for @noParcelsHint.
  ///
  /// In en, this message translates to:
  /// **'Parcels you send, receive or carry will appear here.'**
  String get noParcelsHint;

  /// No description provided for @noMatches.
  ///
  /// In en, this message translates to:
  /// **'No parcels match this search'**
  String get noMatches;

  /// No description provided for @allCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up'**
  String get allCaughtUp;

  /// No description provided for @nothingWaiting.
  ///
  /// In en, this message translates to:
  /// **'No parcels are waiting for you.'**
  String get nothingWaiting;

  /// No description provided for @from.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get from;

  /// No description provided for @to.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get to;

  /// No description provided for @carrier.
  ///
  /// In en, this message translates to:
  /// **'Carrier'**
  String get carrier;

  /// No description provided for @timeline.
  ///
  /// In en, this message translates to:
  /// **'Custody timeline'**
  String get timeline;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @priority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get priority;

  /// No description provided for @classification.
  ///
  /// In en, this message translates to:
  /// **'Classification'**
  String get classification;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @receipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get receipt;

  /// No description provided for @receivedBy.
  ///
  /// In en, this message translates to:
  /// **'Received by'**
  String get receivedBy;

  /// No description provided for @onBehalfOf.
  ///
  /// In en, this message translates to:
  /// **'On behalf of {name}'**
  String onBehalfOf(Object name);

  /// No description provided for @verifiedBy.
  ///
  /// In en, this message translates to:
  /// **'Verified by'**
  String get verifiedBy;

  /// No description provided for @attachments.
  ///
  /// In en, this message translates to:
  /// **'Evidence & attachments'**
  String get attachments;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @showQr.
  ///
  /// In en, this message translates to:
  /// **'QR label'**
  String get showQr;

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @upcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get upcoming;

  /// No description provided for @expectedBy.
  ///
  /// In en, this message translates to:
  /// **'Expected by {time}'**
  String expectedBy(Object time);

  /// No description provided for @overdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get overdue;

  /// No description provided for @exceptionOpen.
  ///
  /// In en, this message translates to:
  /// **'Exception open'**
  String get exceptionOpen;

  /// No description provided for @sentOnBehalf.
  ///
  /// In en, this message translates to:
  /// **'Booked by {name} on the sender\'s behalf'**
  String sentOnBehalf(Object name);

  /// No description provided for @contentHidden.
  ///
  /// In en, this message translates to:
  /// **'Contents are restricted for your role.'**
  String get contentHidden;

  /// No description provided for @actionAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept assignment'**
  String get actionAccept;

  /// No description provided for @actionRequestHandover.
  ///
  /// In en, this message translates to:
  /// **'Request handover'**
  String get actionRequestHandover;

  /// No description provided for @actionConfirmHandover.
  ///
  /// In en, this message translates to:
  /// **'Confirm handover'**
  String get actionConfirmHandover;

  /// No description provided for @actionEnterPin.
  ///
  /// In en, this message translates to:
  /// **'Enter sender\'s PIN'**
  String get actionEnterPin;

  /// No description provided for @actionOfficerHandover.
  ///
  /// In en, this message translates to:
  /// **'Confirm as dispatch officer'**
  String get actionOfficerHandover;

  /// No description provided for @actionStartTransit.
  ///
  /// In en, this message translates to:
  /// **'Start transit'**
  String get actionStartTransit;

  /// No description provided for @actionCheckpoint.
  ///
  /// In en, this message translates to:
  /// **'Add checkpoint'**
  String get actionCheckpoint;

  /// No description provided for @actionArrived.
  ///
  /// In en, this message translates to:
  /// **'Mark arrived'**
  String get actionArrived;

  /// No description provided for @actionReceive.
  ///
  /// In en, this message translates to:
  /// **'Receive parcel'**
  String get actionReceive;

  /// No description provided for @actionReceiveOnBehalf.
  ///
  /// In en, this message translates to:
  /// **'Receive on behalf'**
  String get actionReceiveOnBehalf;

  /// No description provided for @actionReceiveWithCode.
  ///
  /// In en, this message translates to:
  /// **'Receiver has a code'**
  String get actionReceiveWithCode;

  /// No description provided for @actionSendCode.
  ///
  /// In en, this message translates to:
  /// **'Send receipt code'**
  String get actionSendCode;

  /// No description provided for @actionException.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get actionException;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel dispatch'**
  String get actionCancel;

  /// No description provided for @actionReturn.
  ///
  /// In en, this message translates to:
  /// **'Request return'**
  String get actionReturn;

  /// No description provided for @actionStartReturn.
  ///
  /// In en, this message translates to:
  /// **'Start return'**
  String get actionStartReturn;

  /// No description provided for @actionConfirmReturn.
  ///
  /// In en, this message translates to:
  /// **'Confirm it\'s back'**
  String get actionConfirmReturn;

  /// No description provided for @actionBook.
  ///
  /// In en, this message translates to:
  /// **'Book now'**
  String get actionBook;

  /// No description provided for @actionComment.
  ///
  /// In en, this message translates to:
  /// **'Add note'**
  String get actionComment;

  /// No description provided for @confirmHandoverBody.
  ///
  /// In en, this message translates to:
  /// **'Confirm you have handed this parcel to {name}. The time and your name are recorded.'**
  String confirmHandoverBody(Object name);

  /// No description provided for @pinTitle.
  ///
  /// In en, this message translates to:
  /// **'Sender\'s handover PIN'**
  String get pinTitle;

  /// No description provided for @pinHint.
  ///
  /// In en, this message translates to:
  /// **'Ask the sender for the 6-digit PIN they received when booking.'**
  String get pinHint;

  /// No description provided for @receiveTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm receipt'**
  String get receiveTitle;

  /// No description provided for @receiveBody.
  ///
  /// In en, this message translates to:
  /// **'Confirm this parcel is in your hands. Your name, employee ID and the time are recorded as proof.'**
  String get receiveBody;

  /// No description provided for @scanToReceive.
  ///
  /// In en, this message translates to:
  /// **'Scan the label to receive'**
  String get scanToReceive;

  /// No description provided for @onBehalfTitle.
  ///
  /// In en, this message translates to:
  /// **'Receive on behalf'**
  String get onBehalfTitle;

  /// No description provided for @onBehalfBody.
  ///
  /// In en, this message translates to:
  /// **'You are receiving this for {name}. They will be notified that you have it.'**
  String onBehalfBody(Object name);

  /// No description provided for @reasonLabel.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reasonLabel;

  /// No description provided for @reasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Receiver is in a meeting'**
  String get reasonHint;

  /// No description provided for @relationshipLabel.
  ///
  /// In en, this message translates to:
  /// **'Your relationship'**
  String get relationshipLabel;

  /// No description provided for @relationshipHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Assistant, same department'**
  String get relationshipHint;

  /// No description provided for @receiptCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Receiver\'s code'**
  String get receiptCodeTitle;

  /// No description provided for @receiptCodeBody.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code the receiver got by SMS.'**
  String get receiptCodeBody;

  /// No description provided for @signature.
  ///
  /// In en, this message translates to:
  /// **'Receiver\'s signature'**
  String get signature;

  /// No description provided for @signatureRequired.
  ///
  /// In en, this message translates to:
  /// **'A signature is required for highly confidential parcels.'**
  String get signatureRequired;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @exceptionType.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get exceptionType;

  /// No description provided for @exceptionDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get exceptionDetails;

  /// No description provided for @returnTitle.
  ///
  /// In en, this message translates to:
  /// **'Request a return'**
  String get returnTitle;

  /// No description provided for @cancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this dispatch?'**
  String get cancelTitle;

  /// No description provided for @checkpointLabel.
  ///
  /// In en, this message translates to:
  /// **'Where are you?'**
  String get checkpointLabel;

  /// No description provided for @checkpointHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Factory A main gate'**
  String get checkpointHint;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @savedOffline.
  ///
  /// In en, this message translates to:
  /// **'Saved offline. It will sync automatically when you\'re back online.'**
  String get savedOffline;

  /// No description provided for @pendingSync.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 action waiting to sync} other{{count} actions waiting to sync}}'**
  String pendingSync(int count);

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @syncNeedsAttention.
  ///
  /// In en, this message translates to:
  /// **'Needs attention'**
  String get syncNeedsAttention;

  /// No description provided for @offline.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline'**
  String get offline;

  /// No description provided for @dismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get dismiss;

  /// No description provided for @newParcel.
  ///
  /// In en, this message translates to:
  /// **'New parcel'**
  String get newParcel;

  /// No description provided for @stepWhat.
  ///
  /// In en, this message translates to:
  /// **'What'**
  String get stepWhat;

  /// No description provided for @stepWho.
  ///
  /// In en, this message translates to:
  /// **'To whom'**
  String get stepWho;

  /// No description provided for @stepHow.
  ///
  /// In en, this message translates to:
  /// **'Carrier'**
  String get stepHow;

  /// No description provided for @stepReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get stepReview;

  /// No description provided for @titleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get titleLabel;

  /// No description provided for @titleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Quarterly Supplier Agreement'**
  String get titleHint;

  /// No description provided for @descriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get descriptionLabel;

  /// No description provided for @descriptionHint.
  ///
  /// In en, this message translates to:
  /// **'What is inside, and any handling instructions'**
  String get descriptionHint;

  /// No description provided for @receiverEmployee.
  ///
  /// In en, this message translates to:
  /// **'Employee'**
  String get receiverEmployee;

  /// No description provided for @receiverDepartment.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get receiverDepartment;

  /// No description provided for @receiverBranch.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get receiverBranch;

  /// No description provided for @receiverExternal.
  ///
  /// In en, this message translates to:
  /// **'External'**
  String get receiverExternal;

  /// No description provided for @searchEmployee.
  ///
  /// In en, this message translates to:
  /// **'Search name, ID, phone or department'**
  String get searchEmployee;

  /// No description provided for @destination.
  ///
  /// In en, this message translates to:
  /// **'Destination'**
  String get destination;

  /// No description provided for @carrierEmployee.
  ///
  /// In en, this message translates to:
  /// **'ABG employee'**
  String get carrierEmployee;

  /// No description provided for @carrierCourier.
  ///
  /// In en, this message translates to:
  /// **'Courier company'**
  String get carrierCourier;

  /// No description provided for @carrierGuest.
  ///
  /// In en, this message translates to:
  /// **'Guest person'**
  String get carrierGuest;

  /// No description provided for @assignLater.
  ///
  /// In en, this message translates to:
  /// **'Let dispatch assign a courier'**
  String get assignLater;

  /// No description provided for @courierCompany.
  ///
  /// In en, this message translates to:
  /// **'Courier company'**
  String get courierCompany;

  /// No description provided for @trackingNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Courier tracking / consignment no.'**
  String get trackingNumberLabel;

  /// No description provided for @riderName.
  ///
  /// In en, this message translates to:
  /// **'Rider name (optional)'**
  String get riderName;

  /// No description provided for @riderPhone.
  ///
  /// In en, this message translates to:
  /// **'Rider phone (optional)'**
  String get riderPhone;

  /// No description provided for @guestName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get guestName;

  /// No description provided for @guestCompany.
  ///
  /// In en, this message translates to:
  /// **'Company (optional)'**
  String get guestCompany;

  /// No description provided for @vehicleNumber.
  ///
  /// In en, this message translates to:
  /// **'Vehicle number (optional)'**
  String get vehicleNumber;

  /// No description provided for @externalName.
  ///
  /// In en, this message translates to:
  /// **'Receiver name'**
  String get externalName;

  /// No description provided for @externalOrg.
  ///
  /// In en, this message translates to:
  /// **'Organisation'**
  String get externalOrg;

  /// No description provided for @externalAddress.
  ///
  /// In en, this message translates to:
  /// **'Delivery address'**
  String get externalAddress;

  /// No description provided for @expectedDelivery.
  ///
  /// In en, this message translates to:
  /// **'Expected delivery'**
  String get expectedDelivery;

  /// No description provided for @noDeadline.
  ///
  /// In en, this message translates to:
  /// **'No deadline'**
  String get noDeadline;

  /// No description provided for @bookParcel.
  ///
  /// In en, this message translates to:
  /// **'Book parcel'**
  String get bookParcel;

  /// No description provided for @saveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save as draft'**
  String get saveDraft;

  /// No description provided for @reviewNotice.
  ///
  /// In en, this message translates to:
  /// **'Booking creates a tracking ID and QR label. Every handover from now on is recorded.'**
  String get reviewNotice;

  /// No description provided for @bookedTitle.
  ///
  /// In en, this message translates to:
  /// **'Parcel booked'**
  String get bookedTitle;

  /// No description provided for @bookedBody.
  ///
  /// In en, this message translates to:
  /// **'Attach the QR label to the envelope or package.'**
  String get bookedBody;

  /// No description provided for @handoverPin.
  ///
  /// In en, this message translates to:
  /// **'Handover PIN'**
  String get handoverPin;

  /// No description provided for @handoverPinHint.
  ///
  /// In en, this message translates to:
  /// **'Share this PIN with the courier only at the moment you hand the parcel over.'**
  String get handoverPinHint;

  /// No description provided for @viewParcel.
  ///
  /// In en, this message translates to:
  /// **'View parcel'**
  String get viewParcel;

  /// No description provided for @bookAnother.
  ///
  /// In en, this message translates to:
  /// **'Book another'**
  String get bookAnother;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @scanTitle.
  ///
  /// In en, this message translates to:
  /// **'Scan parcel'**
  String get scanTitle;

  /// No description provided for @scanHint.
  ///
  /// In en, this message translates to:
  /// **'Align the QR label inside the frame'**
  String get scanHint;

  /// No description provided for @enterManually.
  ///
  /// In en, this message translates to:
  /// **'Enter tracking ID'**
  String get enterManually;

  /// No description provided for @trackingIdLabel.
  ///
  /// In en, this message translates to:
  /// **'Tracking ID'**
  String get trackingIdLabel;

  /// No description provided for @lookUp.
  ///
  /// In en, this message translates to:
  /// **'Look up'**
  String get lookUp;

  /// No description provided for @cameraUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Camera unavailable on this device. Enter the tracking ID instead.'**
  String get cameraUnavailable;

  /// No description provided for @torch.
  ///
  /// In en, this message translates to:
  /// **'Torch'**
  String get torch;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterAction.
  ///
  /// In en, this message translates to:
  /// **'Action required'**
  String get filterAction;

  /// No description provided for @filterUpdates.
  ///
  /// In en, this message translates to:
  /// **'Updates'**
  String get filterUpdates;

  /// No description provided for @filterSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get filterSystem;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get noNotifications;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileTitle;

  /// No description provided for @employeeId.
  ///
  /// In en, this message translates to:
  /// **'Employee ID'**
  String get employeeId;

  /// No description provided for @department.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get department;

  /// No description provided for @office.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get office;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @pushNotifications.
  ///
  /// In en, this message translates to:
  /// **'Push notifications'**
  String get pushNotifications;

  /// No description provided for @smsNotifications.
  ///
  /// In en, this message translates to:
  /// **'SMS notifications'**
  String get smsNotifications;

  /// No description provided for @sessions.
  ///
  /// In en, this message translates to:
  /// **'Signed-in devices'**
  String get sessions;

  /// No description provided for @thisDevice.
  ///
  /// In en, this message translates to:
  /// **'This device'**
  String get thisDevice;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signOutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Sign out of ABG ONE on this device?'**
  String get signOutConfirm;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get help;

  /// No description provided for @helpBody.
  ///
  /// In en, this message translates to:
  /// **'Contact the dispatch desk at Head Office, Level 2, or call 09612-000100.'**
  String get helpBody;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy & security'**
  String get privacy;

  /// No description provided for @privacyBody.
  ///
  /// In en, this message translates to:
  /// **'Your sign-in is stored in the device\'s secure keystore. QR labels carry no personal data. Every custody action is recorded with your name and the server time.'**
  String get privacyBody;

  /// No description provided for @version.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String version(Object version);

  /// No description provided for @roles.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get roles;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'Can\'t reach ABG ONE. Check your connection and try again.'**
  String get errorNetwork;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'That didn\'t work. Please try again.'**
  String get errorGeneric;

  /// No description provided for @guestHello.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String guestHello(Object name);

  /// No description provided for @guestAssignments.
  ///
  /// In en, this message translates to:
  /// **'Your assignments'**
  String get guestAssignments;

  /// No description provided for @guestNoAssignments.
  ///
  /// In en, this message translates to:
  /// **'No active assignments right now.'**
  String get guestNoAssignments;

  /// No description provided for @guestSessionNote.
  ///
  /// In en, this message translates to:
  /// **'This carrier session only shows parcels assigned to you and ends automatically.'**
  String get guestSessionNote;

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'Just now'**
  String get justNow;

  /// No description provided for @minutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} min ago'**
  String minutesAgo(int count);

  /// No description provided for @hoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} h ago'**
  String hoursAgo(int count);

  /// No description provided for @yesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get yesterday;

  /// No description provided for @statusDRAFT.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get statusDRAFT;

  /// No description provided for @statusBOOKED.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get statusBOOKED;

  /// No description provided for @statusAWAITING_PICKUP.
  ///
  /// In en, this message translates to:
  /// **'Awaiting Pickup'**
  String get statusAWAITING_PICKUP;

  /// No description provided for @statusPICKED_UP.
  ///
  /// In en, this message translates to:
  /// **'Picked Up'**
  String get statusPICKED_UP;

  /// No description provided for @statusIN_TRANSIT.
  ///
  /// In en, this message translates to:
  /// **'In Transit'**
  String get statusIN_TRANSIT;

  /// No description provided for @statusARRIVED_AT_DESTINATION.
  ///
  /// In en, this message translates to:
  /// **'Arrived'**
  String get statusARRIVED_AT_DESTINATION;

  /// No description provided for @statusPENDING_RECEIPT.
  ///
  /// In en, this message translates to:
  /// **'Pending Receipt'**
  String get statusPENDING_RECEIPT;

  /// No description provided for @statusRECEIVED.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get statusRECEIVED;

  /// No description provided for @statusON_HOLD.
  ///
  /// In en, this message translates to:
  /// **'On Hold'**
  String get statusON_HOLD;

  /// No description provided for @statusDELIVERY_EXCEPTION.
  ///
  /// In en, this message translates to:
  /// **'Exception'**
  String get statusDELIVERY_EXCEPTION;

  /// No description provided for @statusDELIVERY_FAILED.
  ///
  /// In en, this message translates to:
  /// **'Delivery Failed'**
  String get statusDELIVERY_FAILED;

  /// No description provided for @statusRETURN_REQUESTED.
  ///
  /// In en, this message translates to:
  /// **'Return Requested'**
  String get statusRETURN_REQUESTED;

  /// No description provided for @statusRETURN_IN_TRANSIT.
  ///
  /// In en, this message translates to:
  /// **'Return In Transit'**
  String get statusRETURN_IN_TRANSIT;

  /// No description provided for @statusRETURNED.
  ///
  /// In en, this message translates to:
  /// **'Returned'**
  String get statusRETURNED;

  /// No description provided for @statusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCANCELLED;

  /// No description provided for @priorityNORMAL.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get priorityNORMAL;

  /// No description provided for @priorityPRIORITY.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get priorityPRIORITY;

  /// No description provided for @priorityURGENT.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get priorityURGENT;

  /// No description provided for @priorityCRITICAL.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get priorityCRITICAL;

  /// No description provided for @classNORMAL.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get classNORMAL;

  /// No description provided for @classINTERNAL.
  ///
  /// In en, this message translates to:
  /// **'Internal'**
  String get classINTERNAL;

  /// No description provided for @classCONFIDENTIAL.
  ///
  /// In en, this message translates to:
  /// **'Confidential'**
  String get classCONFIDENTIAL;

  /// No description provided for @classHIGHLY_CONFIDENTIAL.
  ///
  /// In en, this message translates to:
  /// **'Highly Confidential'**
  String get classHIGHLY_CONFIDENTIAL;

  /// No description provided for @carrierTypeINTERNAL_EMPLOYEE.
  ///
  /// In en, this message translates to:
  /// **'Employee courier'**
  String get carrierTypeINTERNAL_EMPLOYEE;

  /// No description provided for @carrierTypeEXTERNAL_COURIER.
  ///
  /// In en, this message translates to:
  /// **'Courier company'**
  String get carrierTypeEXTERNAL_COURIER;

  /// No description provided for @carrierTypeGUEST_PERSON.
  ///
  /// In en, this message translates to:
  /// **'Guest carrier'**
  String get carrierTypeGUEST_PERSON;

  /// No description provided for @excRECEIVER_UNAVAILABLE.
  ///
  /// In en, this message translates to:
  /// **'Receiver unavailable'**
  String get excRECEIVER_UNAVAILABLE;

  /// No description provided for @excWRONG_DESTINATION.
  ///
  /// In en, this message translates to:
  /// **'Wrong destination'**
  String get excWRONG_DESTINATION;

  /// No description provided for @excADDRESS_CLARIFICATION.
  ///
  /// In en, this message translates to:
  /// **'Address needs clarification'**
  String get excADDRESS_CLARIFICATION;

  /// No description provided for @excPACKAGE_DAMAGED.
  ///
  /// In en, this message translates to:
  /// **'Package damaged'**
  String get excPACKAGE_DAMAGED;

  /// No description provided for @excOFFICE_CLOSED.
  ///
  /// In en, this message translates to:
  /// **'Office closed'**
  String get excOFFICE_CLOSED;

  /// No description provided for @excSEAL_BROKEN.
  ///
  /// In en, this message translates to:
  /// **'Seal broken'**
  String get excSEAL_BROKEN;

  /// No description provided for @excAWAITING_AUTHORIZATION.
  ///
  /// In en, this message translates to:
  /// **'Waiting for authorisation'**
  String get excAWAITING_AUTHORIZATION;

  /// No description provided for @excOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get excOTHER;

  /// No description provided for @dispatchedTo.
  ///
  /// In en, this message translates to:
  /// **'{from} → {to}'**
  String dispatchedTo(Object from, Object to);

  /// No description provided for @trackingCopied.
  ///
  /// In en, this message translates to:
  /// **'Tracking ID copied'**
  String get trackingCopied;

  /// No description provided for @handoverRequested.
  ///
  /// In en, this message translates to:
  /// **'The sender has been asked to confirm.'**
  String get handoverRequested;

  /// No description provided for @receiptCodeSent.
  ///
  /// In en, this message translates to:
  /// **'Code sent to {phone}'**
  String receiptCodeSent(Object phone);

  /// No description provided for @addEvidence.
  ///
  /// In en, this message translates to:
  /// **'Add photo evidence'**
  String get addEvidence;

  /// No description provided for @evidenceAdded.
  ///
  /// In en, this message translates to:
  /// **'Evidence attached'**
  String get evidenceAdded;

  /// No description provided for @evidenceHint.
  ///
  /// In en, this message translates to:
  /// **'Photograph the sealed envelope or package — never its contents.'**
  String get evidenceHint;

  /// No description provided for @sentToPhone.
  ///
  /// In en, this message translates to:
  /// **'Sent to {phone}'**
  String sentToPhone(Object phone);

  /// No description provided for @you.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get you;

  /// No description provided for @moreActions.
  ///
  /// In en, this message translates to:
  /// **'More actions'**
  String get moreActions;

  /// No description provided for @incReport.
  ///
  /// In en, this message translates to:
  /// **'Report an incident'**
  String get incReport;

  /// No description provided for @incReportHint.
  ///
  /// In en, this message translates to:
  /// **'Spotted a problem? Snap a photo — your office\'s admins are told at once.'**
  String get incReportHint;

  /// No description provided for @incMyReports.
  ///
  /// In en, this message translates to:
  /// **'My reports'**
  String get incMyReports;

  /// No description provided for @incOpenCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No open reports} =1{1 open report} other{{count} open reports}}'**
  String incOpenCount(int count);

  /// No description provided for @incWhatKind.
  ///
  /// In en, this message translates to:
  /// **'What kind of problem?'**
  String get incWhatKind;

  /// No description provided for @incTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get incTitleLabel;

  /// No description provided for @incTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Plaster falling from the wall near lift 2'**
  String get incTitleHint;

  /// No description provided for @incDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'What did you see? (optional)'**
  String get incDescriptionLabel;

  /// No description provided for @incWhere.
  ///
  /// In en, this message translates to:
  /// **'Where is it?'**
  String get incWhere;

  /// No description provided for @incOffice.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get incOffice;

  /// No description provided for @incArea.
  ///
  /// In en, this message translates to:
  /// **'Area (optional)'**
  String get incArea;

  /// No description provided for @incAreaAny.
  ///
  /// In en, this message translates to:
  /// **'Not sure / somewhere in the office'**
  String get incAreaAny;

  /// No description provided for @incSpot.
  ///
  /// In en, this message translates to:
  /// **'Exact spot (optional)'**
  String get incSpot;

  /// No description provided for @incSpotHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 3rd floor, beside the lift'**
  String get incSpotHint;

  /// No description provided for @incHowUrgent.
  ///
  /// In en, this message translates to:
  /// **'How urgent is it?'**
  String get incHowUrgent;

  /// No description provided for @incPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get incPhotos;

  /// No description provided for @incPhotosHint.
  ///
  /// In en, this message translates to:
  /// **'Add up to 3 photos. A clear photo helps the team fix it faster.'**
  String get incPhotosHint;

  /// No description provided for @incTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get incTakePhoto;

  /// No description provided for @incChoosePhoto.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get incChoosePhoto;

  /// No description provided for @incRemovePhoto.
  ///
  /// In en, this message translates to:
  /// **'Remove photo'**
  String get incRemovePhoto;

  /// No description provided for @incAnonymous.
  ///
  /// In en, this message translates to:
  /// **'Report anonymously'**
  String get incAnonymous;

  /// No description provided for @incAnonymousHint.
  ///
  /// In en, this message translates to:
  /// **'Admins won\'t see your name. It is kept only so you can follow the status.'**
  String get incAnonymousHint;

  /// No description provided for @incMisconductNote.
  ///
  /// In en, this message translates to:
  /// **'Misconduct reports go to Head Office only — never to your own office\'s admins.'**
  String get incMisconductNote;

  /// No description provided for @incSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get incSubmit;

  /// No description provided for @incSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Report {ref} sent. The admin team has been notified.'**
  String incSubmitted(Object ref);

  /// No description provided for @incTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Give a short title (at least 3 characters)'**
  String get incTitleRequired;

  /// No description provided for @incCategoryRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose what kind of problem it is'**
  String get incCategoryRequired;

  /// No description provided for @incNoReports.
  ///
  /// In en, this message translates to:
  /// **'No reports yet'**
  String get incNoReports;

  /// No description provided for @incNoReportsHint.
  ///
  /// In en, this message translates to:
  /// **'When you report a problem, you can follow its progress here.'**
  String get incNoReportsHint;

  /// No description provided for @incFilterOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get incFilterOpen;

  /// No description provided for @incFilterClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get incFilterClosed;

  /// No description provided for @incFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get incFilterAll;

  /// No description provided for @incStatusPENDING.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get incStatusPENDING;

  /// No description provided for @incStatusPROCESSING.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get incStatusPROCESSING;

  /// No description provided for @incStatusDONE.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get incStatusDONE;

  /// No description provided for @incStatusDECLINED.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get incStatusDECLINED;

  /// No description provided for @incCatBUILDING_DAMAGE.
  ///
  /// In en, this message translates to:
  /// **'Building damage'**
  String get incCatBUILDING_DAMAGE;

  /// No description provided for @incCatCLEANLINESS.
  ///
  /// In en, this message translates to:
  /// **'Cleanliness'**
  String get incCatCLEANLINESS;

  /// No description provided for @incCatCAFETERIA_HYGIENE.
  ///
  /// In en, this message translates to:
  /// **'Cafeteria hygiene'**
  String get incCatCAFETERIA_HYGIENE;

  /// No description provided for @incCatWASHROOM.
  ///
  /// In en, this message translates to:
  /// **'Washroom'**
  String get incCatWASHROOM;

  /// No description provided for @incCatSAFETY_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Safety hazard'**
  String get incCatSAFETY_HAZARD;

  /// No description provided for @incCatELECTRICAL.
  ///
  /// In en, this message translates to:
  /// **'Electrical'**
  String get incCatELECTRICAL;

  /// No description provided for @incCatSECURITY.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get incCatSECURITY;

  /// No description provided for @incCatMISCONDUCT.
  ///
  /// In en, this message translates to:
  /// **'Misconduct'**
  String get incCatMISCONDUCT;

  /// No description provided for @incCatOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get incCatOTHER;

  /// No description provided for @incSevLOW.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get incSevLOW;

  /// No description provided for @incSevMEDIUM.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get incSevMEDIUM;

  /// No description provided for @incSevHIGH.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get incSevHIGH;

  /// No description provided for @incSevURGENT.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get incSevURGENT;

  /// No description provided for @incProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get incProgress;

  /// No description provided for @incStepSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get incStepSubmitted;

  /// No description provided for @incStepProcessing.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get incStepProcessing;

  /// No description provided for @incStepDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get incStepDone;

  /// No description provided for @incStepDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get incStepDeclined;

  /// No description provided for @incAdminUpdate.
  ///
  /// In en, this message translates to:
  /// **'Update from the admin team'**
  String get incAdminUpdate;

  /// No description provided for @incReportedBy.
  ///
  /// In en, this message translates to:
  /// **'Reported by'**
  String get incReportedBy;

  /// No description provided for @incAnonymousBadge.
  ///
  /// In en, this message translates to:
  /// **'Anonymous'**
  String get incAnonymousBadge;

  /// No description provided for @incAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add another photo'**
  String get incAddPhoto;

  /// No description provided for @incPhotoAdded.
  ///
  /// In en, this message translates to:
  /// **'Photo added'**
  String get incPhotoAdded;

  /// No description provided for @incFixPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos of the fix'**
  String get incFixPhotos;

  /// No description provided for @incHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get incHistory;

  /// No description provided for @incEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Report submitted'**
  String get incEvSubmitted;

  /// No description provided for @incEvStatus.
  ///
  /// In en, this message translates to:
  /// **'Marked {status}'**
  String incEvStatus(Object status);

  /// No description provided for @incEvReopened.
  ///
  /// In en, this message translates to:
  /// **'Reopened'**
  String get incEvReopened;

  /// No description provided for @incEvNote.
  ///
  /// In en, this message translates to:
  /// **'Update for you'**
  String get incEvNote;

  /// No description provided for @incEvPhoto.
  ///
  /// In en, this message translates to:
  /// **'Photo added'**
  String get incEvPhoto;

  /// No description provided for @incEvDetails.
  ///
  /// In en, this message translates to:
  /// **'Details updated'**
  String get incEvDetails;

  /// No description provided for @incWaitingForAdmin.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the admin team to pick it up.'**
  String get incWaitingForAdmin;

  /// No description provided for @incOfflineNotice.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline. Reports with photos need a connection — try again when you\'re back online.'**
  String get incOfflineNotice;

  /// No description provided for @nbTitle.
  ///
  /// In en, this message translates to:
  /// **'Notice board'**
  String get nbTitle;

  /// No description provided for @nbSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Official notices from the Chairman, the MD, HR and administration'**
  String get nbSubtitle;

  /// No description provided for @nbFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get nbFilterAll;

  /// No description provided for @nbFilterUnread.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get nbFilterUnread;

  /// No description provided for @nbChannelCHAIRMAN.
  ///
  /// In en, this message translates to:
  /// **'Chairman'**
  String get nbChannelCHAIRMAN;

  /// No description provided for @nbChannelMANAGING_DIRECTOR.
  ///
  /// In en, this message translates to:
  /// **'Managing Director'**
  String get nbChannelMANAGING_DIRECTOR;

  /// No description provided for @nbChannelHR.
  ///
  /// In en, this message translates to:
  /// **'Human Resources'**
  String get nbChannelHR;

  /// No description provided for @nbChannelADMINISTRATION.
  ///
  /// In en, this message translates to:
  /// **'Administration'**
  String get nbChannelADMINISTRATION;

  /// No description provided for @nbChannelCOMPLIANCE.
  ///
  /// In en, this message translates to:
  /// **'Compliance'**
  String get nbChannelCOMPLIANCE;

  /// No description provided for @nbChannelIT.
  ///
  /// In en, this message translates to:
  /// **'IT'**
  String get nbChannelIT;

  /// No description provided for @nbCatGENERAL.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get nbCatGENERAL;

  /// No description provided for @nbCatCIRCULAR.
  ///
  /// In en, this message translates to:
  /// **'Circular'**
  String get nbCatCIRCULAR;

  /// No description provided for @nbCatPOLICY.
  ///
  /// In en, this message translates to:
  /// **'Policy'**
  String get nbCatPOLICY;

  /// No description provided for @nbCatHR.
  ///
  /// In en, this message translates to:
  /// **'HR'**
  String get nbCatHR;

  /// No description provided for @nbCatSAFETY.
  ///
  /// In en, this message translates to:
  /// **'Safety'**
  String get nbCatSAFETY;

  /// No description provided for @nbCatEVENT.
  ///
  /// In en, this message translates to:
  /// **'Event'**
  String get nbCatEVENT;

  /// No description provided for @nbCatHOLIDAY.
  ///
  /// In en, this message translates to:
  /// **'Holiday'**
  String get nbCatHOLIDAY;

  /// No description provided for @nbUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get nbUrgent;

  /// No description provided for @nbPinned.
  ///
  /// In en, this message translates to:
  /// **'Pinned'**
  String get nbPinned;

  /// No description provided for @nbNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get nbNew;

  /// No description provided for @nbAcknowledged.
  ///
  /// In en, this message translates to:
  /// **'Acknowledged'**
  String get nbAcknowledged;

  /// No description provided for @nbAckNeeded.
  ///
  /// In en, this message translates to:
  /// **'Please acknowledge'**
  String get nbAckNeeded;

  /// No description provided for @nbHasPdf.
  ///
  /// In en, this message translates to:
  /// **'PDF attached'**
  String get nbHasPdf;

  /// No description provided for @nbUnreadCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Everything read} =1{1 unread notice} other{{count} unread notices}}'**
  String nbUnreadCount(int count);

  /// No description provided for @nbToAckCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 waiting for your acknowledgement} other{{count} waiting for your acknowledgement}}'**
  String nbToAckCount(int count);

  /// No description provided for @nbEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notices here'**
  String get nbEmpty;

  /// No description provided for @nbEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Notices addressed to you appear here, urgent ones first.'**
  String get nbEmptyHint;

  /// No description provided for @nbEmptyUnreadHint.
  ///
  /// In en, this message translates to:
  /// **'You have read every notice on the board.'**
  String get nbEmptyUnreadHint;

  /// No description provided for @nbShowAll.
  ///
  /// In en, this message translates to:
  /// **'Show all notices'**
  String get nbShowAll;

  /// No description provided for @nbFromOffice.
  ///
  /// In en, this message translates to:
  /// **'From the office of the {channel}'**
  String nbFromOffice(Object channel);

  /// No description provided for @nbUrgentBanner.
  ///
  /// In en, this message translates to:
  /// **'Urgent notice — please read it now'**
  String get nbUrgentBanner;

  /// No description provided for @nbPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get nbPublished;

  /// No description provided for @nbAudience.
  ///
  /// In en, this message translates to:
  /// **'Addressed to'**
  String get nbAudience;

  /// No description provided for @nbAudienceAll.
  ///
  /// In en, this message translates to:
  /// **'Everyone in the group'**
  String get nbAudienceAll;

  /// No description provided for @nbOnBoardUntil.
  ///
  /// In en, this message translates to:
  /// **'On the board until'**
  String get nbOnBoardUntil;

  /// No description provided for @nbExpired.
  ///
  /// In en, this message translates to:
  /// **'This notice has expired.'**
  String get nbExpired;

  /// No description provided for @nbArchived.
  ///
  /// In en, this message translates to:
  /// **'This notice has been taken off the board.'**
  String get nbArchived;

  /// No description provided for @nbSignedBy.
  ///
  /// In en, this message translates to:
  /// **'Signed by'**
  String get nbSignedBy;

  /// No description provided for @nbAttachment.
  ///
  /// In en, this message translates to:
  /// **'Attached document'**
  String get nbAttachment;

  /// No description provided for @nbOpenPdf.
  ///
  /// In en, this message translates to:
  /// **'Open the PDF'**
  String get nbOpenPdf;

  /// No description provided for @nbPdfHint.
  ///
  /// In en, this message translates to:
  /// **'Opens in your phone\'s PDF viewer'**
  String get nbPdfHint;

  /// No description provided for @nbPdfFailed.
  ///
  /// In en, this message translates to:
  /// **'The PDF could not be opened. Check your connection and try again.'**
  String get nbPdfFailed;

  /// No description provided for @nbAckPrompt.
  ///
  /// In en, this message translates to:
  /// **'The sender asks you to confirm that you have read and understood this notice.'**
  String get nbAckPrompt;

  /// No description provided for @nbAckButton.
  ///
  /// In en, this message translates to:
  /// **'I have read and understood'**
  String get nbAckButton;

  /// No description provided for @nbAckTitle.
  ///
  /// In en, this message translates to:
  /// **'Acknowledge this notice'**
  String get nbAckTitle;

  /// No description provided for @nbAckBody.
  ///
  /// In en, this message translates to:
  /// **'You confirm that you have read and understood this notice. Your name and the time are recorded for the sender.'**
  String get nbAckBody;

  /// No description provided for @nbAckConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get nbAckConfirm;

  /// No description provided for @nbAckDone.
  ///
  /// In en, this message translates to:
  /// **'Thank you — your acknowledgement is recorded.'**
  String get nbAckDone;

  /// No description provided for @nbAckedOn.
  ///
  /// In en, this message translates to:
  /// **'You acknowledged this notice · {time}'**
  String nbAckedOn(Object time);

  /// No description provided for @nbAckExpired.
  ///
  /// In en, this message translates to:
  /// **'This notice has expired and can no longer be acknowledged.'**
  String get nbAckExpired;

  /// No description provided for @nbNoAckNeeded.
  ///
  /// In en, this message translates to:
  /// **'For your information — no acknowledgement needed.'**
  String get nbNoAckNeeded;

  /// No description provided for @nbAuthorNote.
  ///
  /// In en, this message translates to:
  /// **'You published this notice. See who has read it in the admin portal.'**
  String get nbAuthorNote;
}

class _LDelegate extends LocalizationsDelegate<L> {
  const _LDelegate();

  @override
  Future<L> load(Locale locale) {
    return SynchronousFuture<L>(lookupL(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['bn', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_LDelegate old) => false;
}

L lookupL(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'bn':
      return LBn();
    case 'en':
      return LEn();
  }

  throw FlutterError(
    'L.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
