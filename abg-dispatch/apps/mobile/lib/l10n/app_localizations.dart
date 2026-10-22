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

  /// No description provided for @visTitle.
  ///
  /// In en, this message translates to:
  /// **'Visitors'**
  String get visTitle;

  /// No description provided for @visMyVisitors.
  ///
  /// In en, this message translates to:
  /// **'My visitors'**
  String get visMyVisitors;

  /// No description provided for @visGate.
  ///
  /// In en, this message translates to:
  /// **'Gate'**
  String get visGate;

  /// No description provided for @visInvite.
  ///
  /// In en, this message translates to:
  /// **'Invite a visitor'**
  String get visInvite;

  /// No description provided for @visUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get visUpcoming;

  /// No description provided for @visPast.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get visPast;

  /// No description provided for @visNoUpcoming.
  ///
  /// In en, this message translates to:
  /// **'No visitors coming'**
  String get visNoUpcoming;

  /// No description provided for @visNoUpcomingHint.
  ///
  /// In en, this message translates to:
  /// **'Invite a visitor and they get a gate pass number by SMS. You are told when they arrive and leave.'**
  String get visNoUpcomingHint;

  /// No description provided for @visNoPast.
  ///
  /// In en, this message translates to:
  /// **'No past visitors yet'**
  String get visNoPast;

  /// No description provided for @visStatusEXPECTED.
  ///
  /// In en, this message translates to:
  /// **'Expected'**
  String get visStatusEXPECTED;

  /// No description provided for @visStatusCHECKED_IN.
  ///
  /// In en, this message translates to:
  /// **'On site'**
  String get visStatusCHECKED_IN;

  /// No description provided for @visStatusCHECKED_OUT.
  ///
  /// In en, this message translates to:
  /// **'Checked out'**
  String get visStatusCHECKED_OUT;

  /// No description provided for @visStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get visStatusCANCELLED;

  /// No description provided for @visStatusEXPIRED.
  ///
  /// In en, this message translates to:
  /// **'Did not arrive'**
  String get visStatusEXPIRED;

  /// No description provided for @visStatusSemantics.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String visStatusSemantics(Object status);

  /// No description provided for @visPurposeMEETING.
  ///
  /// In en, this message translates to:
  /// **'Meeting'**
  String get visPurposeMEETING;

  /// No description provided for @visPurposeINTERVIEW.
  ///
  /// In en, this message translates to:
  /// **'Interview'**
  String get visPurposeINTERVIEW;

  /// No description provided for @visPurposeVENDOR_SUPPLIER.
  ///
  /// In en, this message translates to:
  /// **'Vendor / supplier'**
  String get visPurposeVENDOR_SUPPLIER;

  /// No description provided for @visPurposeCONTRACTOR.
  ///
  /// In en, this message translates to:
  /// **'Contractor work'**
  String get visPurposeCONTRACTOR;

  /// No description provided for @visPurposeAUDIT_INSPECTION.
  ///
  /// In en, this message translates to:
  /// **'Audit / inspection'**
  String get visPurposeAUDIT_INSPECTION;

  /// No description provided for @visPurposeGOVERNMENT_OFFICIAL.
  ///
  /// In en, this message translates to:
  /// **'Government official'**
  String get visPurposeGOVERNMENT_OFFICIAL;

  /// No description provided for @visPurposeDELIVERY.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get visPurposeDELIVERY;

  /// No description provided for @visPurposePERSONAL.
  ///
  /// In en, this message translates to:
  /// **'Personal'**
  String get visPurposePERSONAL;

  /// No description provided for @visPurposeOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get visPurposeOTHER;

  /// No description provided for @visWalkIn.
  ///
  /// In en, this message translates to:
  /// **'Walk-in'**
  String get visWalkIn;

  /// No description provided for @visOverstay.
  ///
  /// In en, this message translates to:
  /// **'Past expected time'**
  String get visOverstay;

  /// No description provided for @visInSince.
  ///
  /// In en, this message translates to:
  /// **'In since {time}'**
  String visInSince(Object time);

  /// No description provided for @visLeftAt.
  ///
  /// In en, this message translates to:
  /// **'Left at {time}'**
  String visLeftAt(Object time);

  /// No description provided for @visExpectedAt.
  ///
  /// In en, this message translates to:
  /// **'Expected {time}'**
  String visExpectedAt(Object time);

  /// No description provided for @visHostIs.
  ///
  /// In en, this message translates to:
  /// **'Host: {name}'**
  String visHostIs(Object name);

  /// No description provided for @visCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get visCheckIn;

  /// No description provided for @visCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Check out'**
  String get visCheckOut;

  /// No description provided for @visCheckedIn.
  ///
  /// In en, this message translates to:
  /// **'{name} checked in — the host has been told.'**
  String visCheckedIn(Object name);

  /// No description provided for @visCheckedOut.
  ///
  /// In en, this message translates to:
  /// **'{name} checked out.'**
  String visCheckedOut(Object name);

  /// No description provided for @visPassTitle.
  ///
  /// In en, this message translates to:
  /// **'Visitor gate pass'**
  String get visPassTitle;

  /// No description provided for @visQrSemantics.
  ///
  /// In en, this message translates to:
  /// **'QR code for gate pass {number}'**
  String visQrSemantics(Object number);

  /// No description provided for @visCopyPassNumber.
  ///
  /// In en, this message translates to:
  /// **'Copy pass number'**
  String get visCopyPassNumber;

  /// No description provided for @visPassNumberCopied.
  ///
  /// In en, this message translates to:
  /// **'Pass number copied'**
  String get visPassNumberCopied;

  /// No description provided for @visValidToday.
  ///
  /// In en, this message translates to:
  /// **'Valid today only · show it at the gate in and out'**
  String get visValidToday;

  /// No description provided for @visValidOn.
  ///
  /// In en, this message translates to:
  /// **'Valid on {date} only · show it at the gate in and out'**
  String visValidOn(Object date);

  /// No description provided for @visHost.
  ///
  /// In en, this message translates to:
  /// **'Host'**
  String get visHost;

  /// No description provided for @visPurpose.
  ///
  /// In en, this message translates to:
  /// **'Purpose'**
  String get visPurpose;

  /// No description provided for @visArea.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get visArea;

  /// No description provided for @visTime.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get visTime;

  /// No description provided for @visParty.
  ///
  /// In en, this message translates to:
  /// **'Party'**
  String get visParty;

  /// No description provided for @visPartyCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 person} other{{count} people}}'**
  String visPartyCount(int count);

  /// No description provided for @visVehicle.
  ///
  /// In en, this message translates to:
  /// **'Vehicle number'**
  String get visVehicle;

  /// No description provided for @visNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get visNone;

  /// No description provided for @visCarrying.
  ///
  /// In en, this message translates to:
  /// **'Carrying'**
  String get visCarrying;

  /// No description provided for @visPassFooter.
  ///
  /// In en, this message translates to:
  /// **'Wear the visitor badge on site and return it at the gate. Issued by ABG ONE.'**
  String get visPassFooter;

  /// No description provided for @visLiveOnSite.
  ///
  /// In en, this message translates to:
  /// **'Live · on site now'**
  String get visLiveOnSite;

  /// No description provided for @visOnSiteSemantics.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nobody on site now} =1{1 visitor on site now} other{{count} visitors on site now}}'**
  String visOnSiteSemantics(int count);

  /// No description provided for @visCounting.
  ///
  /// In en, this message translates to:
  /// **'Counting…'**
  String get visCounting;

  /// No description provided for @visPeopleOnSite.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 person on site} other{{count} people on site}}'**
  String visPeopleOnSite(int count);

  /// No description provided for @visStillExpected.
  ///
  /// In en, this message translates to:
  /// **'{count} still expected today'**
  String visStillExpected(int count);

  /// No description provided for @visOverstaying.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 visitor past their expected time} other{{count} visitors past their expected time}}'**
  String visOverstaying(int count);

  /// No description provided for @visLongest.
  ///
  /// In en, this message translates to:
  /// **'Longest on site: {name} · {time}'**
  String visLongest(Object name, Object time);

  /// No description provided for @visScanPass.
  ///
  /// In en, this message translates to:
  /// **'Scan pass'**
  String get visScanPass;

  /// No description provided for @visWalkInAction.
  ///
  /// In en, this message translates to:
  /// **'Walk-in'**
  String get visWalkInAction;

  /// No description provided for @visStatCheckedOut.
  ///
  /// In en, this message translates to:
  /// **'Checked out today'**
  String get visStatCheckedOut;

  /// No description provided for @visStatWalkIns.
  ///
  /// In en, this message translates to:
  /// **'Walk-ins today'**
  String get visStatWalkIns;

  /// No description provided for @visStatVisits.
  ///
  /// In en, this message translates to:
  /// **'Visits today'**
  String get visStatVisits;

  /// No description provided for @visPassNumberHint.
  ///
  /// In en, this message translates to:
  /// **'Type a pass number, e.g. VP-261021-FCA-012'**
  String get visPassNumberHint;

  /// No description provided for @visVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify pass'**
  String get visVerify;

  /// No description provided for @visOnSiteNow.
  ///
  /// In en, this message translates to:
  /// **'On site now'**
  String get visOnSiteNow;

  /// No description provided for @visExpectedToday.
  ///
  /// In en, this message translates to:
  /// **'Expected today'**
  String get visExpectedToday;

  /// No description provided for @visNobodyOnSite.
  ///
  /// In en, this message translates to:
  /// **'Nobody is on site right now.'**
  String get visNobodyOnSite;

  /// No description provided for @visNobodyExpected.
  ///
  /// In en, this message translates to:
  /// **'Nobody else is expected today.'**
  String get visNobodyExpected;

  /// No description provided for @visWalkInTitle.
  ///
  /// In en, this message translates to:
  /// **'Register a walk-in'**
  String get visWalkInTitle;

  /// No description provided for @visInviteHint.
  ///
  /// In en, this message translates to:
  /// **'You are the host. Your visitor gets the gate pass number by SMS, and you are told when they arrive and leave.'**
  String get visInviteHint;

  /// No description provided for @visWalkInHint.
  ///
  /// In en, this message translates to:
  /// **'For someone who arrived without a pass. They are checked in now and their host is told they are at the gate.'**
  String get visWalkInHint;

  /// No description provided for @visVisitorSection.
  ///
  /// In en, this message translates to:
  /// **'Visitor'**
  String get visVisitorSection;

  /// No description provided for @visVisitor.
  ///
  /// In en, this message translates to:
  /// **'Visitor'**
  String get visVisitor;

  /// No description provided for @visNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Visitor\'s name'**
  String get visNameLabel;

  /// No description provided for @visPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get visPhoneLabel;

  /// No description provided for @visPhoneHelper.
  ///
  /// In en, this message translates to:
  /// **'The gate pass number is texted here.'**
  String get visPhoneHelper;

  /// No description provided for @visCompanyLabel.
  ///
  /// In en, this message translates to:
  /// **'Company or organisation'**
  String get visCompanyLabel;

  /// No description provided for @visCompanyHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Akij Packaging Ltd, DIFE Narayanganj'**
  String get visCompanyHint;

  /// No description provided for @visPurposeTitle.
  ///
  /// In en, this message translates to:
  /// **'Purpose of the visit'**
  String get visPurposeTitle;

  /// No description provided for @visDetailLabel.
  ///
  /// In en, this message translates to:
  /// **'What for (optional)'**
  String get visDetailLabel;

  /// No description provided for @visDetailHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Carton sample approval'**
  String get visDetailHint;

  /// No description provided for @visHereToSee.
  ///
  /// In en, this message translates to:
  /// **'Here to see'**
  String get visHereToSee;

  /// No description provided for @visSearchDirectory.
  ///
  /// In en, this message translates to:
  /// **'Search directory'**
  String get visSearchDirectory;

  /// No description provided for @visNotListed.
  ///
  /// In en, this message translates to:
  /// **'Not listed?'**
  String get visNotListed;

  /// No description provided for @visHostNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name of the person or team being visited'**
  String get visHostNameLabel;

  /// No description provided for @visChooseHost.
  ///
  /// In en, this message translates to:
  /// **'Choose the employee being visited'**
  String get visChooseHost;

  /// No description provided for @visHostNoAccount.
  ///
  /// In en, this message translates to:
  /// **'Not on ABG ONE — tell them in person'**
  String get visHostNoAccount;

  /// No description provided for @visHostSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Name, employee ID or department'**
  String get visHostSearchHint;

  /// No description provided for @visWhenWhere.
  ///
  /// In en, this message translates to:
  /// **'When and where'**
  String get visWhenWhere;

  /// No description provided for @visDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get visDate;

  /// No description provided for @visFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get visFrom;

  /// No description provided for @visUntil.
  ///
  /// In en, this message translates to:
  /// **'Until'**
  String get visUntil;

  /// No description provided for @visLeaveBy.
  ///
  /// In en, this message translates to:
  /// **'Expected to leave by'**
  String get visLeaveBy;

  /// No description provided for @visOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get visOptional;

  /// No description provided for @visClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get visClear;

  /// No description provided for @visOffice.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get visOffice;

  /// No description provided for @visAreaAny.
  ///
  /// In en, this message translates to:
  /// **'Anywhere in the office'**
  String get visAreaAny;

  /// No description provided for @visPartyLabel.
  ///
  /// In en, this message translates to:
  /// **'People on this pass'**
  String get visPartyLabel;

  /// No description provided for @visPartyFewer.
  ///
  /// In en, this message translates to:
  /// **'One fewer person'**
  String get visPartyFewer;

  /// No description provided for @visPartyMore.
  ///
  /// In en, this message translates to:
  /// **'One more person'**
  String get visPartyMore;

  /// No description provided for @visAtTheGate.
  ///
  /// In en, this message translates to:
  /// **'For the gate'**
  String get visAtTheGate;

  /// No description provided for @visBadgeLabel.
  ///
  /// In en, this message translates to:
  /// **'Badge number (optional)'**
  String get visBadgeLabel;

  /// No description provided for @visCarryingHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Laptop, tools, samples'**
  String get visCarryingHint;

  /// No description provided for @visIdLast4Label.
  ///
  /// In en, this message translates to:
  /// **'ID card — last 4 only'**
  String get visIdLast4Label;

  /// No description provided for @visIdLast4Helper.
  ///
  /// In en, this message translates to:
  /// **'Never type the full NID number.'**
  String get visIdLast4Helper;

  /// No description provided for @visNotesLabel.
  ///
  /// In en, this message translates to:
  /// **'Note for the gate'**
  String get visNotesLabel;

  /// No description provided for @visSubmitInvite.
  ///
  /// In en, this message translates to:
  /// **'Create gate pass'**
  String get visSubmitInvite;

  /// No description provided for @visSubmitWalkIn.
  ///
  /// In en, this message translates to:
  /// **'Register and check in'**
  String get visSubmitWalkIn;

  /// No description provided for @visNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the visitor\'s name.'**
  String get visNameRequired;

  /// No description provided for @visPhoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a Bangladeshi mobile number, e.g. 01711 223344.'**
  String get visPhoneInvalid;

  /// No description provided for @visPurposeRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose the purpose of the visit.'**
  String get visPurposeRequired;

  /// No description provided for @visIdLast4Invalid.
  ///
  /// In en, this message translates to:
  /// **'ID: only the last 4 digits or letters.'**
  String get visIdLast4Invalid;

  /// No description provided for @visHostRequired.
  ///
  /// In en, this message translates to:
  /// **'Say who the visitor has come to see.'**
  String get visHostRequired;

  /// No description provided for @visUntilPassed.
  ///
  /// In en, this message translates to:
  /// **'That leaving time has already passed.'**
  String get visUntilPassed;

  /// No description provided for @visTimePast.
  ///
  /// In en, this message translates to:
  /// **'That time has already passed. Choose a time from now on.'**
  String get visTimePast;

  /// No description provided for @visUntilBeforeStart.
  ///
  /// In en, this message translates to:
  /// **'The visit must end after it starts.'**
  String get visUntilBeforeStart;

  /// No description provided for @visPassCreated.
  ///
  /// In en, this message translates to:
  /// **'Gate pass {pass} created — the visitor has been sent the number by SMS.'**
  String visPassCreated(Object pass);

  /// No description provided for @visWalkInDone.
  ///
  /// In en, this message translates to:
  /// **'{name} is checked in with pass {pass}.'**
  String visWalkInDone(Object name, Object pass);

  /// No description provided for @visCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy number'**
  String get visCopy;

  /// No description provided for @visSendSms.
  ///
  /// In en, this message translates to:
  /// **'Send by SMS'**
  String get visSendSms;

  /// No description provided for @visDetailsCopied.
  ///
  /// In en, this message translates to:
  /// **'Pass details copied'**
  String get visDetailsCopied;

  /// No description provided for @visSmsText.
  ///
  /// In en, this message translates to:
  /// **'ABG gate pass {pass} · {office} · {time} · Host: {host}. Please show this at the gate.'**
  String visSmsText(Object office, Object time, Object host, Object pass);

  /// No description provided for @visPassHidden.
  ///
  /// In en, this message translates to:
  /// **'Only the host and this office\'s gate staff can see the QR gate pass.'**
  String get visPassHidden;

  /// No description provided for @visProgress.
  ///
  /// In en, this message translates to:
  /// **'Where the visit stands'**
  String get visProgress;

  /// No description provided for @visDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get visDetails;

  /// No description provided for @visStepExpected.
  ///
  /// In en, this message translates to:
  /// **'Expected'**
  String get visStepExpected;

  /// No description provided for @visStepWalkIn.
  ///
  /// In en, this message translates to:
  /// **'Walk-in registered'**
  String get visStepWalkIn;

  /// No description provided for @visStepOnSite.
  ///
  /// In en, this message translates to:
  /// **'Checked in'**
  String get visStepOnSite;

  /// No description provided for @visStepOut.
  ///
  /// In en, this message translates to:
  /// **'Checked out'**
  String get visStepOut;

  /// No description provided for @visStepCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get visStepCancelled;

  /// No description provided for @visStepExpired.
  ///
  /// In en, this message translates to:
  /// **'Did not arrive'**
  String get visStepExpired;

  /// No description provided for @visStepExpiredHint.
  ///
  /// In en, this message translates to:
  /// **'The pass lapsed at the end of its day.'**
  String get visStepExpiredHint;

  /// No description provided for @visBy.
  ///
  /// In en, this message translates to:
  /// **'by {name}'**
  String visBy(Object name);

  /// No description provided for @visOnSiteFor.
  ///
  /// In en, this message translates to:
  /// **'{time} on site'**
  String visOnSiteFor(Object time);

  /// No description provided for @visCheckInTitle.
  ///
  /// In en, this message translates to:
  /// **'Check in {name}?'**
  String visCheckInTitle(Object name);

  /// No description provided for @visCheckInBody.
  ///
  /// In en, this message translates to:
  /// **'Check their ID card and hand over a visitor badge. The host is told at once.'**
  String get visCheckInBody;

  /// No description provided for @visCheckInBodyId.
  ///
  /// In en, this message translates to:
  /// **'Compare the ID card (last 4: {last4}) and hand over a visitor badge. The host is told at once.'**
  String visCheckInBodyId(Object last4);

  /// No description provided for @visCheckOutTitle.
  ///
  /// In en, this message translates to:
  /// **'Check out {name}?'**
  String visCheckOutTitle(Object name);

  /// No description provided for @visCheckOutBody.
  ///
  /// In en, this message translates to:
  /// **'The pass cannot be used again after check-out.'**
  String get visCheckOutBody;

  /// No description provided for @visCheckOutBodyBadge.
  ///
  /// In en, this message translates to:
  /// **'Collect badge {badge}. The pass cannot be used again after check-out.'**
  String visCheckOutBodyBadge(Object badge);

  /// No description provided for @visCancelPass.
  ///
  /// In en, this message translates to:
  /// **'Cancel pass'**
  String get visCancelPass;

  /// No description provided for @visCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this gate pass?'**
  String get visCancelTitle;

  /// No description provided for @visCancelBody.
  ///
  /// In en, this message translates to:
  /// **'{name} is sent an SMS that the visit is cancelled, and the pass stops working at the gate.'**
  String visCancelBody(Object name);

  /// No description provided for @visCancelReason.
  ///
  /// In en, this message translates to:
  /// **'Reason (optional)'**
  String get visCancelReason;

  /// No description provided for @visCancelled.
  ///
  /// In en, this message translates to:
  /// **'Gate pass cancelled — the visitor has been told by SMS.'**
  String get visCancelled;

  /// No description provided for @visPassNotFound.
  ///
  /// In en, this message translates to:
  /// **'Pass not recognised'**
  String get visPassNotFound;

  /// No description provided for @visPassNotFoundHint.
  ///
  /// In en, this message translates to:
  /// **'Do not admit the visitor on it — call the host or register them as a walk-in.'**
  String get visPassNotFoundHint;

  /// No description provided for @visScanAnother.
  ///
  /// In en, this message translates to:
  /// **'Scan another pass'**
  String get visScanAnother;

  /// No description provided for @visBlockWrongOffice.
  ///
  /// In en, this message translates to:
  /// **'Wrong office'**
  String get visBlockWrongOffice;

  /// No description provided for @visBlockWrongDay.
  ///
  /// In en, this message translates to:
  /// **'Not valid today'**
  String get visBlockWrongDay;

  /// No description provided for @visBlockCancelled.
  ///
  /// In en, this message translates to:
  /// **'Pass cancelled'**
  String get visBlockCancelled;

  /// No description provided for @visBlockExpired.
  ///
  /// In en, this message translates to:
  /// **'Pass expired'**
  String get visBlockExpired;

  /// No description provided for @visBlockAlreadyOut.
  ///
  /// In en, this message translates to:
  /// **'Pass already used'**
  String get visBlockAlreadyOut;

  /// No description provided for @visBlockGeneric.
  ///
  /// In en, this message translates to:
  /// **'Not valid'**
  String get visBlockGeneric;

  /// No description provided for @visVerdictValid.
  ///
  /// In en, this message translates to:
  /// **'Valid pass'**
  String get visVerdictValid;

  /// No description provided for @visVerdictValidBody.
  ///
  /// In en, this message translates to:
  /// **'Expected {time} to see {host}. Check the ID, then check the visitor in.'**
  String visVerdictValidBody(Object time, Object host);

  /// No description provided for @visVerdictOnSite.
  ///
  /// In en, this message translates to:
  /// **'On site'**
  String get visVerdictOnSite;

  /// No description provided for @visVerdictOnSiteBody.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}. Check them out as they leave.'**
  String visVerdictOnSiteBody(Object time);

  /// No description provided for @visVerdictGenuine.
  ///
  /// In en, this message translates to:
  /// **'Genuine pass'**
  String get visVerdictGenuine;

  /// No description provided for @visVerdictGenuineBody.
  ///
  /// In en, this message translates to:
  /// **'Your role can verify passes but not check visitors in or out. Ask security or the front desk.'**
  String get visVerdictGenuineBody;

  /// No description provided for @visIdCompare.
  ///
  /// In en, this message translates to:
  /// **'Compare with the ID card — last 4'**
  String get visIdCompare;

  /// No description provided for @visOpenVisit.
  ///
  /// In en, this message translates to:
  /// **'Open the visit'**
  String get visOpenVisit;
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
