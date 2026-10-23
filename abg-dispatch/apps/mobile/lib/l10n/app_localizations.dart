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

  /// No description provided for @aptTitle.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get aptTitle;

  /// No description provided for @aptRequest.
  ///
  /// In en, this message translates to:
  /// **'Request a meeting'**
  String get aptRequest;

  /// No description provided for @aptMine.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get aptMine;

  /// No description provided for @aptToAnswer.
  ///
  /// In en, this message translates to:
  /// **'To answer'**
  String get aptToAnswer;

  /// No description provided for @aptDiary.
  ///
  /// In en, this message translates to:
  /// **'Diary'**
  String get aptDiary;

  /// No description provided for @aptNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No meeting requests yet'**
  String get aptNoRequests;

  /// No description provided for @aptNoRequestsHint.
  ///
  /// In en, this message translates to:
  /// **'Ask the MD, the Chairman or a head of department for time. Their office confirms or proposes another slot.'**
  String get aptNoRequestsHint;

  /// No description provided for @aptNothingToAnswer.
  ///
  /// In en, this message translates to:
  /// **'No requests waiting'**
  String get aptNothingToAnswer;

  /// No description provided for @aptNothingToAnswerHint.
  ///
  /// In en, this message translates to:
  /// **'Meeting requests addressed to you (or, for the executive office, to the MD and Chairman) appear here.'**
  String get aptNothingToAnswerHint;

  /// No description provided for @aptDiaryEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing confirmed in the next two weeks.'**
  String get aptDiaryEmpty;

  /// No description provided for @aptWaitingCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 request is waiting for an answer} other{{count} requests are waiting for an answer}}'**
  String aptWaitingCount(int count);

  /// No description provided for @aptStatusPENDING.
  ///
  /// In en, this message translates to:
  /// **'Awaiting confirmation'**
  String get aptStatusPENDING;

  /// No description provided for @aptStatusPROPOSED.
  ///
  /// In en, this message translates to:
  /// **'New time proposed'**
  String get aptStatusPROPOSED;

  /// No description provided for @aptStatusCONFIRMED.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get aptStatusCONFIRMED;

  /// No description provided for @aptStatusCOMPLETED.
  ///
  /// In en, this message translates to:
  /// **'Held'**
  String get aptStatusCOMPLETED;

  /// No description provided for @aptStatusDECLINED.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get aptStatusDECLINED;

  /// No description provided for @aptStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get aptStatusCANCELLED;

  /// No description provided for @aptPurposeBUSINESS_REVIEW.
  ///
  /// In en, this message translates to:
  /// **'Business review / report'**
  String get aptPurposeBUSINESS_REVIEW;

  /// No description provided for @aptPurposeAPPROVAL.
  ///
  /// In en, this message translates to:
  /// **'Approval or signature'**
  String get aptPurposeAPPROVAL;

  /// No description provided for @aptPurposePROJECT_UPDATE.
  ///
  /// In en, this message translates to:
  /// **'Project update'**
  String get aptPurposePROJECT_UPDATE;

  /// No description provided for @aptPurposePROPOSAL.
  ///
  /// In en, this message translates to:
  /// **'New proposal'**
  String get aptPurposePROPOSAL;

  /// No description provided for @aptPurposePERSONAL.
  ///
  /// In en, this message translates to:
  /// **'Personal / HR matter'**
  String get aptPurposePERSONAL;

  /// No description provided for @aptPurposeCOURTESY.
  ///
  /// In en, this message translates to:
  /// **'Courtesy call'**
  String get aptPurposeCOURTESY;

  /// No description provided for @aptPurposeOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get aptPurposeOTHER;

  /// No description provided for @aptModeIN_PERSON.
  ///
  /// In en, this message translates to:
  /// **'In person'**
  String get aptModeIN_PERSON;

  /// No description provided for @aptModeVIDEO.
  ///
  /// In en, this message translates to:
  /// **'Video call'**
  String get aptModeVIDEO;

  /// No description provided for @aptModePHONE.
  ///
  /// In en, this message translates to:
  /// **'Phone call'**
  String get aptModePHONE;

  /// No description provided for @aptMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String aptMinutes(int count);

  /// No description provided for @aptUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get aptUrgent;

  /// No description provided for @aptWith.
  ///
  /// In en, this message translates to:
  /// **'With {name}'**
  String aptWith(Object name);

  /// No description provided for @aptFrom.
  ///
  /// In en, this message translates to:
  /// **'From {name}'**
  String aptFrom(Object name);

  /// No description provided for @aptAsked.
  ///
  /// In en, this message translates to:
  /// **'Asked for {when}'**
  String aptAsked(Object when);

  /// No description provided for @aptProposedFor.
  ///
  /// In en, this message translates to:
  /// **'Proposed: {when}'**
  String aptProposedFor(Object when);

  /// No description provided for @aptFormIntro.
  ///
  /// In en, this message translates to:
  /// **'The executive office (for the MD and Chairman) or the person you ask confirms the time, proposes another one, or declines.'**
  String get aptFormIntro;

  /// No description provided for @aptWhoSection.
  ///
  /// In en, this message translates to:
  /// **'Who do you want to meet?'**
  String get aptWhoSection;

  /// No description provided for @aptChooseHost.
  ///
  /// In en, this message translates to:
  /// **'Choose who to meet'**
  String get aptChooseHost;

  /// No description provided for @aptHostHint.
  ///
  /// In en, this message translates to:
  /// **'The MD, the Chairman and heads of department are listed first. Search for anyone else.'**
  String get aptHostHint;

  /// No description provided for @aptSearchHosts.
  ///
  /// In en, this message translates to:
  /// **'Search by name, designation or department'**
  String get aptSearchHosts;

  /// No description provided for @aptExecutive.
  ///
  /// In en, this message translates to:
  /// **'Executive'**
  String get aptExecutive;

  /// No description provided for @aptHeadOfDept.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get aptHeadOfDept;

  /// No description provided for @aptOfficeAnswers.
  ///
  /// In en, this message translates to:
  /// **'The executive office answers for them.'**
  String get aptOfficeAnswers;

  /// No description provided for @aptAboutSection.
  ///
  /// In en, this message translates to:
  /// **'What is it about?'**
  String get aptAboutSection;

  /// No description provided for @aptSubjectLabel.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get aptSubjectLabel;

  /// No description provided for @aptSubjectHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Q3 sales review for the steel division'**
  String get aptSubjectHint;

  /// No description provided for @aptAgendaLabel.
  ///
  /// In en, this message translates to:
  /// **'Agenda or background (optional)'**
  String get aptAgendaLabel;

  /// No description provided for @aptHowSection.
  ///
  /// In en, this message translates to:
  /// **'How and how long'**
  String get aptHowSection;

  /// No description provided for @aptWhenSection.
  ///
  /// In en, this message translates to:
  /// **'When suits you'**
  String get aptWhenSection;

  /// No description provided for @aptPreferred.
  ///
  /// In en, this message translates to:
  /// **'Preferred time'**
  String get aptPreferred;

  /// No description provided for @aptAlternative.
  ///
  /// In en, this message translates to:
  /// **'Alternative time (optional)'**
  String get aptAlternative;

  /// No description provided for @aptPickTime.
  ///
  /// In en, this message translates to:
  /// **'Choose a day and time'**
  String get aptPickTime;

  /// No description provided for @aptHoursNote.
  ///
  /// In en, this message translates to:
  /// **'Meetings are between 8:00 and 20:00, Dhaka time.'**
  String get aptHoursNote;

  /// No description provided for @aptAttendees.
  ///
  /// In en, this message translates to:
  /// **'Others joining (optional)'**
  String get aptAttendees;

  /// No description provided for @aptAttendeeHint.
  ///
  /// In en, this message translates to:
  /// **'Name, then add'**
  String get aptAttendeeHint;

  /// No description provided for @aptAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get aptAdd;

  /// No description provided for @aptUrgentSwitch.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get aptUrgentSwitch;

  /// No description provided for @aptUrgentHint.
  ///
  /// In en, this message translates to:
  /// **'Only when it cannot wait — the office sees it first.'**
  String get aptUrgentHint;

  /// No description provided for @aptSubmit.
  ///
  /// In en, this message translates to:
  /// **'Send request'**
  String get aptSubmit;

  /// No description provided for @aptSubmitted.
  ///
  /// In en, this message translates to:
  /// **'{ref} sent. You will be told when it is answered.'**
  String aptSubmitted(Object ref);

  /// No description provided for @aptErrHost.
  ///
  /// In en, this message translates to:
  /// **'Choose who you want to meet.'**
  String get aptErrHost;

  /// No description provided for @aptErrSubject.
  ///
  /// In en, this message translates to:
  /// **'Write a short subject.'**
  String get aptErrSubject;

  /// No description provided for @aptErrTime.
  ///
  /// In en, this message translates to:
  /// **'Choose the preferred day and time.'**
  String get aptErrTime;

  /// No description provided for @aptErrPast.
  ///
  /// In en, this message translates to:
  /// **'Choose a time at least 15 minutes from now.'**
  String get aptErrPast;

  /// No description provided for @aptErrHours.
  ///
  /// In en, this message translates to:
  /// **'Meetings are between 8:00 and 20:00 and must end by 20:00.'**
  String get aptErrHours;

  /// No description provided for @aptErrFar.
  ///
  /// In en, this message translates to:
  /// **'Meetings can be asked for at most 90 days ahead.'**
  String get aptErrFar;

  /// No description provided for @aptErrSame.
  ///
  /// In en, this message translates to:
  /// **'The alternative time is the same as the preferred one.'**
  String get aptErrSame;

  /// No description provided for @aptMeeting.
  ///
  /// In en, this message translates to:
  /// **'Meeting'**
  String get aptMeeting;

  /// No description provided for @aptWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get aptWhen;

  /// No description provided for @aptLength.
  ///
  /// In en, this message translates to:
  /// **'Length'**
  String get aptLength;

  /// No description provided for @aptModeLabel.
  ///
  /// In en, this message translates to:
  /// **'How'**
  String get aptModeLabel;

  /// No description provided for @aptLocation.
  ///
  /// In en, this message translates to:
  /// **'Where'**
  String get aptLocation;

  /// No description provided for @aptPurposeLabel.
  ///
  /// In en, this message translates to:
  /// **'Purpose'**
  String get aptPurposeLabel;

  /// No description provided for @aptAgenda.
  ///
  /// In en, this message translates to:
  /// **'Agenda'**
  String get aptAgenda;

  /// No description provided for @aptJoining.
  ///
  /// In en, this message translates to:
  /// **'Also joining'**
  String get aptJoining;

  /// No description provided for @aptPeople.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get aptPeople;

  /// No description provided for @aptRequester.
  ///
  /// In en, this message translates to:
  /// **'Asked by'**
  String get aptRequester;

  /// No description provided for @aptHost.
  ///
  /// In en, this message translates to:
  /// **'Meeting with'**
  String get aptHost;

  /// No description provided for @aptAnsweredBy.
  ///
  /// In en, this message translates to:
  /// **'Answered by'**
  String get aptAnsweredBy;

  /// No description provided for @aptTimesAsked.
  ///
  /// In en, this message translates to:
  /// **'Times asked for'**
  String get aptTimesAsked;

  /// No description provided for @aptPreferredShort.
  ///
  /// In en, this message translates to:
  /// **'Preferred'**
  String get aptPreferredShort;

  /// No description provided for @aptAlternativeShort.
  ///
  /// In en, this message translates to:
  /// **'Alternative'**
  String get aptAlternativeShort;

  /// No description provided for @aptClashTitle.
  ///
  /// In en, this message translates to:
  /// **'Clashes with the diary'**
  String get aptClashTitle;

  /// No description provided for @aptClashBody.
  ///
  /// In en, this message translates to:
  /// **'{name} already has: {list}'**
  String aptClashBody(Object name, Object list);

  /// No description provided for @aptProposedBanner.
  ///
  /// In en, this message translates to:
  /// **'{who} proposed {when} instead.'**
  String aptProposedBanner(Object who, Object when);

  /// No description provided for @aptProposedAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept this time, or cancel the request if it does not suit you.'**
  String get aptProposedAccept;

  /// No description provided for @aptConfirmedBanner.
  ///
  /// In en, this message translates to:
  /// **'Confirmed for {when}.'**
  String aptConfirmedBanner(Object when);

  /// No description provided for @aptActConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get aptActConfirm;

  /// No description provided for @aptActPropose.
  ///
  /// In en, this message translates to:
  /// **'Propose a time'**
  String get aptActPropose;

  /// No description provided for @aptActReschedule.
  ///
  /// In en, this message translates to:
  /// **'Move the meeting'**
  String get aptActReschedule;

  /// No description provided for @aptActDecline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get aptActDecline;

  /// No description provided for @aptActAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept the time'**
  String get aptActAccept;

  /// No description provided for @aptActCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get aptActCancel;

  /// No description provided for @aptActComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as held'**
  String get aptActComplete;

  /// No description provided for @aptConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm the meeting'**
  String get aptConfirmTitle;

  /// No description provided for @aptConfirmHint.
  ///
  /// In en, this message translates to:
  /// **'Pick one of the times asked for, add the place, and the requester is told.'**
  String get aptConfirmHint;

  /// No description provided for @aptLocationLabel.
  ///
  /// In en, this message translates to:
  /// **'Place or link (optional)'**
  String get aptLocationLabel;

  /// No description provided for @aptLocationHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. MD\'s office, Level 12'**
  String get aptLocationHint;

  /// No description provided for @aptProposeTitle.
  ///
  /// In en, this message translates to:
  /// **'Propose another time'**
  String get aptProposeTitle;

  /// No description provided for @aptProposeHint.
  ///
  /// In en, this message translates to:
  /// **'The requester accepts the new time or cancels.'**
  String get aptProposeHint;

  /// No description provided for @aptNewTime.
  ///
  /// In en, this message translates to:
  /// **'New time'**
  String get aptNewTime;

  /// No description provided for @aptProposeReason.
  ///
  /// In en, this message translates to:
  /// **'Why another time (shown to the requester)'**
  String get aptProposeReason;

  /// No description provided for @aptDeclineHint.
  ///
  /// In en, this message translates to:
  /// **'Tell the requester why. They can ask again.'**
  String get aptDeclineHint;

  /// No description provided for @aptCancelHint.
  ///
  /// In en, this message translates to:
  /// **'Say why. The other side is told.'**
  String get aptCancelHint;

  /// No description provided for @aptCompleteHint.
  ///
  /// In en, this message translates to:
  /// **'Add a short note of the outcome if useful.'**
  String get aptCompleteHint;

  /// No description provided for @aptSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get aptSend;

  /// No description provided for @aptDoneConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed — the requester has been told.'**
  String get aptDoneConfirmed;

  /// No description provided for @aptDoneProposed.
  ///
  /// In en, this message translates to:
  /// **'New time sent to the requester.'**
  String get aptDoneProposed;

  /// No description provided for @aptDoneDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined — the requester has been told.'**
  String get aptDoneDeclined;

  /// No description provided for @aptDoneAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted — the meeting is confirmed.'**
  String get aptDoneAccepted;

  /// No description provided for @aptDoneCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled.'**
  String get aptDoneCancelled;

  /// No description provided for @aptDoneCompleted.
  ///
  /// In en, this message translates to:
  /// **'Marked as held.'**
  String get aptDoneCompleted;

  /// No description provided for @aptStageAsked.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get aptStageAsked;

  /// No description provided for @aptStageAnswer.
  ///
  /// In en, this message translates to:
  /// **'Answer'**
  String get aptStageAnswer;

  /// No description provided for @aptStageMeeting.
  ///
  /// In en, this message translates to:
  /// **'Meeting'**
  String get aptStageMeeting;

  /// No description provided for @aptEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get aptEvSubmitted;

  /// No description provided for @aptEvProposed.
  ///
  /// In en, this message translates to:
  /// **'New time proposed: {when}'**
  String aptEvProposed(Object when);

  /// No description provided for @aptEvConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get aptEvConfirmed;

  /// No description provided for @aptEvDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get aptEvDeclined;

  /// No description provided for @aptEvCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get aptEvCancelled;

  /// No description provided for @aptEvCompleted.
  ///
  /// In en, this message translates to:
  /// **'Held'**
  String get aptEvCompleted;

  /// No description provided for @aptEvNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get aptEvNote;

  /// No description provided for @aptToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get aptToday;

  /// No description provided for @aptTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get aptTomorrow;

  /// No description provided for @aptFromTo.
  ///
  /// In en, this message translates to:
  /// **'From {from} · for {to}'**
  String aptFromTo(Object from, Object to);

  /// No description provided for @apprTitle.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get apprTitle;

  /// No description provided for @apprEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for you'**
  String get apprEmpty;

  /// No description provided for @apprEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Leave, meeting, pool car and tour requests that need you appear here.'**
  String get apprEmptyHint;

  /// No description provided for @apprAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get apprAll;

  /// No description provided for @apprTours.
  ///
  /// In en, this message translates to:
  /// **'Official tours'**
  String get apprTours;

  /// No description provided for @apprPoolCar.
  ///
  /// In en, this message translates to:
  /// **'Pool car'**
  String get apprPoolCar;

  /// No description provided for @apprApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get apprApprove;

  /// No description provided for @apprReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get apprReject;

  /// No description provided for @apprRejectTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject this request?'**
  String get apprRejectTitle;

  /// No description provided for @apprRejectReason.
  ///
  /// In en, this message translates to:
  /// **'Reason (shown to the requester)'**
  String get apprRejectReason;

  /// No description provided for @apprApproveTitle.
  ///
  /// In en, this message translates to:
  /// **'Approve this request?'**
  String get apprApproveTitle;

  /// No description provided for @apprNote.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get apprNote;

  /// No description provided for @apprApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved — the requester has been told.'**
  String get apprApproved;

  /// No description provided for @apprRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected — the requester has been told.'**
  String get apprRejected;

  /// No description provided for @apprAwaitingHOD.
  ///
  /// In en, this message translates to:
  /// **'Your approval as head of department'**
  String get apprAwaitingHOD;

  /// No description provided for @apprAwaitingVETTING.
  ///
  /// In en, this message translates to:
  /// **'HR & Finance vetting'**
  String get apprAwaitingVETTING;

  /// No description provided for @apprAwaitingSANCTION.
  ///
  /// In en, this message translates to:
  /// **'MD / Chairman sanction'**
  String get apprAwaitingSANCTION;

  /// No description provided for @apprForeign.
  ///
  /// In en, this message translates to:
  /// **'Foreign'**
  String get apprForeign;

  /// No description provided for @apprLocal.
  ///
  /// In en, this message translates to:
  /// **'Local'**
  String get apprLocal;

  /// No description provided for @apprUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get apprUrgent;

  /// No description provided for @apprPassengers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 passenger} other{{count} passengers}}'**
  String apprPassengers(int count);

  /// No description provided for @apprBudget.
  ///
  /// In en, this message translates to:
  /// **'Budget ৳{amount}'**
  String apprBudget(Object amount);

  /// No description provided for @apprRequestedBy.
  ///
  /// In en, this message translates to:
  /// **'Requested by {name}'**
  String apprRequestedBy(Object name);

  /// No description provided for @apprDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get apprDetails;

  /// No description provided for @apprLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get apprLeave;

  /// No description provided for @apprMeetings.
  ///
  /// In en, this message translates to:
  /// **'Meetings'**
  String get apprMeetings;

  /// No description provided for @apprAwaitingHR.
  ///
  /// In en, this message translates to:
  /// **'Your approval as HR'**
  String get apprAwaitingHR;

  /// No description provided for @apprAwaitingANSWER.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your answer'**
  String get apprAwaitingANSWER;

  /// No description provided for @apprConfirmMeetingTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm at the time asked for?'**
  String get apprConfirmMeetingTitle;

  /// No description provided for @apprDeclineMeetingTitle.
  ///
  /// In en, this message translates to:
  /// **'Decline this meeting?'**
  String get apprDeclineMeetingTitle;

  /// No description provided for @apprMeetingConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed — the requester has been told.'**
  String get apprMeetingConfirmed;

  /// No description provided for @apprMeetingDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined — the requester has been told.'**
  String get apprMeetingDeclined;

  /// No description provided for @audTitle.
  ///
  /// In en, this message translates to:
  /// **'Audit'**
  String get audTitle;

  /// No description provided for @audMyActions.
  ///
  /// In en, this message translates to:
  /// **'My actions'**
  String get audMyActions;

  /// No description provided for @audAudits.
  ///
  /// In en, this message translates to:
  /// **'Audits'**
  String get audAudits;

  /// No description provided for @audNoActions.
  ///
  /// In en, this message translates to:
  /// **'No corrective actions for you'**
  String get audNoActions;

  /// No description provided for @audNoActionsHint.
  ///
  /// In en, this message translates to:
  /// **'When an audit finds something you need to fix, it appears here with its due date.'**
  String get audNoActionsHint;

  /// No description provided for @audNoAudits.
  ///
  /// In en, this message translates to:
  /// **'No audits'**
  String get audNoAudits;

  /// No description provided for @audNoAuditsHint.
  ///
  /// In en, this message translates to:
  /// **'Audits planned for your offices appear here.'**
  String get audNoAuditsHint;

  /// No description provided for @audActionsBanner.
  ///
  /// In en, this message translates to:
  /// **'{open} to fix · {submitted} with the auditor'**
  String audActionsBanner(int open, int submitted);

  /// No description provided for @audOverdueCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 overdue} other{{count} overdue}}'**
  String audOverdueCount(int count);

  /// No description provided for @audTypeINTERNAL.
  ///
  /// In en, this message translates to:
  /// **'Internal audit'**
  String get audTypeINTERNAL;

  /// No description provided for @audTypeCOMPLIANCE.
  ///
  /// In en, this message translates to:
  /// **'Regulatory compliance'**
  String get audTypeCOMPLIANCE;

  /// No description provided for @audTypeSAFETY.
  ///
  /// In en, this message translates to:
  /// **'Fire & safety'**
  String get audTypeSAFETY;

  /// No description provided for @audTypeBUYER.
  ///
  /// In en, this message translates to:
  /// **'Buyer / customer audit'**
  String get audTypeBUYER;

  /// No description provided for @audTypeISO.
  ///
  /// In en, this message translates to:
  /// **'ISO certification'**
  String get audTypeISO;

  /// No description provided for @audTypeFINANCIAL.
  ///
  /// In en, this message translates to:
  /// **'Financial / stock audit'**
  String get audTypeFINANCIAL;

  /// No description provided for @audTypeENVIRONMENT.
  ///
  /// In en, this message translates to:
  /// **'Environmental'**
  String get audTypeENVIRONMENT;

  /// No description provided for @audStatusPLANNED.
  ///
  /// In en, this message translates to:
  /// **'Planned'**
  String get audStatusPLANNED;

  /// No description provided for @audStatusIN_PROGRESS.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get audStatusIN_PROGRESS;

  /// No description provided for @audStatusFOLLOW_UP.
  ///
  /// In en, this message translates to:
  /// **'Actions open'**
  String get audStatusFOLLOW_UP;

  /// No description provided for @audStatusCLOSED.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get audStatusCLOSED;

  /// No description provided for @audStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get audStatusCANCELLED;

  /// No description provided for @audRatingSATISFACTORY.
  ///
  /// In en, this message translates to:
  /// **'Satisfactory'**
  String get audRatingSATISFACTORY;

  /// No description provided for @audRatingNEEDS_IMPROVEMENT.
  ///
  /// In en, this message translates to:
  /// **'Needs improvement'**
  String get audRatingNEEDS_IMPROVEMENT;

  /// No description provided for @audRatingUNSATISFACTORY.
  ///
  /// In en, this message translates to:
  /// **'Unsatisfactory'**
  String get audRatingUNSATISFACTORY;

  /// No description provided for @audSevCRITICAL.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get audSevCRITICAL;

  /// No description provided for @audSevMAJOR.
  ///
  /// In en, this message translates to:
  /// **'Major'**
  String get audSevMAJOR;

  /// No description provided for @audSevMINOR.
  ///
  /// In en, this message translates to:
  /// **'Minor'**
  String get audSevMINOR;

  /// No description provided for @audSevOBSERVATION.
  ///
  /// In en, this message translates to:
  /// **'Observation'**
  String get audSevOBSERVATION;

  /// No description provided for @audSevHintCRITICAL.
  ///
  /// In en, this message translates to:
  /// **'Fix within 7 days — risk to life, licence or a buyer'**
  String get audSevHintCRITICAL;

  /// No description provided for @audSevHintMAJOR.
  ///
  /// In en, this message translates to:
  /// **'Fix within 30 days'**
  String get audSevHintMAJOR;

  /// No description provided for @audSevHintMINOR.
  ///
  /// In en, this message translates to:
  /// **'Fix within 60 days'**
  String get audSevHintMINOR;

  /// No description provided for @audSevHintOBSERVATION.
  ///
  /// In en, this message translates to:
  /// **'No action needed — noted for next time'**
  String get audSevHintOBSERVATION;

  /// No description provided for @audFindStatusOPEN.
  ///
  /// In en, this message translates to:
  /// **'Action open'**
  String get audFindStatusOPEN;

  /// No description provided for @audFindStatusSUBMITTED.
  ///
  /// In en, this message translates to:
  /// **'Fix submitted'**
  String get audFindStatusSUBMITTED;

  /// No description provided for @audFindStatusVERIFIED.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get audFindStatusVERIFIED;

  /// No description provided for @audFindStatusNOTED.
  ///
  /// In en, this message translates to:
  /// **'Noted'**
  String get audFindStatusNOTED;

  /// No description provided for @audDue.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String audDue(Object date);

  /// No description provided for @audOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue since {date}'**
  String audOverdue(Object date);

  /// No description provided for @audOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get audOwner;

  /// No description provided for @audNoOwner.
  ///
  /// In en, this message translates to:
  /// **'No owner'**
  String get audNoOwner;

  /// No description provided for @audFieldwork.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork'**
  String get audFieldwork;

  /// No description provided for @audLead.
  ///
  /// In en, this message translates to:
  /// **'Audit lead'**
  String get audLead;

  /// No description provided for @audBody.
  ///
  /// In en, this message translates to:
  /// **'Outside body'**
  String get audBody;

  /// No description provided for @audTeam.
  ///
  /// In en, this message translates to:
  /// **'Audit team'**
  String get audTeam;

  /// No description provided for @audScope.
  ///
  /// In en, this message translates to:
  /// **'Scope'**
  String get audScope;

  /// No description provided for @audResult.
  ///
  /// In en, this message translates to:
  /// **'Result'**
  String get audResult;

  /// No description provided for @audScore.
  ///
  /// In en, this message translates to:
  /// **'Score {score}/100'**
  String audScore(Object score);

  /// No description provided for @audConclusion.
  ///
  /// In en, this message translates to:
  /// **'Conclusion'**
  String get audConclusion;

  /// No description provided for @audFindings.
  ///
  /// In en, this message translates to:
  /// **'Findings'**
  String get audFindings;

  /// No description provided for @audNoFindings.
  ///
  /// In en, this message translates to:
  /// **'No findings recorded yet.'**
  String get audNoFindings;

  /// No description provided for @audPartial.
  ///
  /// In en, this message translates to:
  /// **'You see the findings you own. The audit team sees the full report.'**
  String get audPartial;

  /// No description provided for @audCountOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get audCountOpen;

  /// No description provided for @audCountSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get audCountSubmitted;

  /// No description provided for @audCountVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get audCountVerified;

  /// No description provided for @audCountOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get audCountOverdue;

  /// No description provided for @audClause.
  ///
  /// In en, this message translates to:
  /// **'Clause or standard'**
  String get audClause;

  /// No description provided for @audArea.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get audArea;

  /// No description provided for @audRecommendation.
  ///
  /// In en, this message translates to:
  /// **'Recommendation'**
  String get audRecommendation;

  /// No description provided for @audResponse.
  ///
  /// In en, this message translates to:
  /// **'Response'**
  String get audResponse;

  /// No description provided for @audVerifiedBy.
  ///
  /// In en, this message translates to:
  /// **'Verified by {name}'**
  String audVerifiedBy(Object name);

  /// No description provided for @audStageStart.
  ///
  /// In en, this message translates to:
  /// **'Planned'**
  String get audStageStart;

  /// No description provided for @audStageFieldwork.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork'**
  String get audStageFieldwork;

  /// No description provided for @audStageActions.
  ///
  /// In en, this message translates to:
  /// **'Corrective actions'**
  String get audStageActions;

  /// No description provided for @audStageClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get audStageClosed;

  /// No description provided for @audActionsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing left open} =1{1 action open} other{{count} actions open}}'**
  String audActionsLeft(int count);

  /// No description provided for @audActStart.
  ///
  /// In en, this message translates to:
  /// **'Start fieldwork'**
  String get audActStart;

  /// No description provided for @audActAddFinding.
  ///
  /// In en, this message translates to:
  /// **'Add a finding'**
  String get audActAddFinding;

  /// No description provided for @audActComplete.
  ///
  /// In en, this message translates to:
  /// **'Finish fieldwork'**
  String get audActComplete;

  /// No description provided for @audActClose.
  ///
  /// In en, this message translates to:
  /// **'Close the audit'**
  String get audActClose;

  /// No description provided for @audActCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel audit'**
  String get audActCancel;

  /// No description provided for @audActSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit my fix'**
  String get audActSubmit;

  /// No description provided for @audActVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get audActVerify;

  /// No description provided for @audActReopen.
  ///
  /// In en, this message translates to:
  /// **'Send back'**
  String get audActReopen;

  /// No description provided for @audActReassign.
  ///
  /// In en, this message translates to:
  /// **'Reassign'**
  String get audActReassign;

  /// No description provided for @audStartHint.
  ///
  /// In en, this message translates to:
  /// **'Findings can be recorded once fieldwork has started. The office is told.'**
  String get audStartHint;

  /// No description provided for @audCloseHint.
  ///
  /// In en, this message translates to:
  /// **'Every corrective action is verified. Closing files the audit.'**
  String get audCloseHint;

  /// No description provided for @audCancelHint.
  ///
  /// In en, this message translates to:
  /// **'Say why the audit will not happen.'**
  String get audCancelHint;

  /// No description provided for @audSubmitTitle.
  ///
  /// In en, this message translates to:
  /// **'Submit your fix'**
  String get audSubmitTitle;

  /// No description provided for @audSubmitHint.
  ///
  /// In en, this message translates to:
  /// **'Say what was done; the auditor verifies it or sends it back.'**
  String get audSubmitHint;

  /// No description provided for @audResponseLabel.
  ///
  /// In en, this message translates to:
  /// **'What was done'**
  String get audResponseLabel;

  /// No description provided for @audVerifyHint.
  ///
  /// In en, this message translates to:
  /// **'The action is closed and the owner is told.'**
  String get audVerifyHint;

  /// No description provided for @audReopenHint.
  ///
  /// In en, this message translates to:
  /// **'Tell the owner what is still missing.'**
  String get audReopenHint;

  /// No description provided for @audChooseOwner.
  ///
  /// In en, this message translates to:
  /// **'Who fixes it?'**
  String get audChooseOwner;

  /// No description provided for @audOwnerHint.
  ///
  /// In en, this message translates to:
  /// **'They see it under Audit · My actions and are reminded when it is overdue.'**
  String get audOwnerHint;

  /// No description provided for @audCompleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Finish fieldwork'**
  String get audCompleteTitle;

  /// No description provided for @audCompleteHint.
  ///
  /// In en, this message translates to:
  /// **'Give the overall result. Open actions stay with their owners until verified.'**
  String get audCompleteHint;

  /// No description provided for @audScoreLabel.
  ///
  /// In en, this message translates to:
  /// **'Score out of 100 (optional)'**
  String get audScoreLabel;

  /// No description provided for @audConclusionLabel.
  ///
  /// In en, this message translates to:
  /// **'Conclusion'**
  String get audConclusionLabel;

  /// No description provided for @audFindingTitle.
  ///
  /// In en, this message translates to:
  /// **'New finding'**
  String get audFindingTitle;

  /// No description provided for @audFindingTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'What was found'**
  String get audFindingTitleLabel;

  /// No description provided for @audFindingTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Fire exit on Level 3 blocked by cartons'**
  String get audFindingTitleHint;

  /// No description provided for @audDetailLabel.
  ///
  /// In en, this message translates to:
  /// **'Detail (optional)'**
  String get audDetailLabel;

  /// No description provided for @audSeverity.
  ///
  /// In en, this message translates to:
  /// **'Severity'**
  String get audSeverity;

  /// No description provided for @audDueLabel.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get audDueLabel;

  /// No description provided for @audSaveFinding.
  ///
  /// In en, this message translates to:
  /// **'Record finding'**
  String get audSaveFinding;

  /// No description provided for @audErrTitle.
  ///
  /// In en, this message translates to:
  /// **'Say briefly what was found.'**
  String get audErrTitle;

  /// No description provided for @audErrOwner.
  ///
  /// In en, this message translates to:
  /// **'Choose who fixes it.'**
  String get audErrOwner;

  /// No description provided for @audErrConclusion.
  ///
  /// In en, this message translates to:
  /// **'Write a short conclusion.'**
  String get audErrConclusion;

  /// No description provided for @audDoneStarted.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork started.'**
  String get audDoneStarted;

  /// No description provided for @audDoneFinding.
  ///
  /// In en, this message translates to:
  /// **'Finding recorded — the owner has been told.'**
  String get audDoneFinding;

  /// No description provided for @audDoneCompleted.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork finished.'**
  String get audDoneCompleted;

  /// No description provided for @audDoneClosed.
  ///
  /// In en, this message translates to:
  /// **'Audit closed.'**
  String get audDoneClosed;

  /// No description provided for @audDoneCancelled.
  ///
  /// In en, this message translates to:
  /// **'Audit cancelled.'**
  String get audDoneCancelled;

  /// No description provided for @audDoneSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Fix submitted — the auditor has been told.'**
  String get audDoneSubmitted;

  /// No description provided for @audDoneVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified — the action is closed.'**
  String get audDoneVerified;

  /// No description provided for @audDoneReopened.
  ///
  /// In en, this message translates to:
  /// **'Sent back to the owner.'**
  String get audDoneReopened;

  /// No description provided for @audDoneReassigned.
  ///
  /// In en, this message translates to:
  /// **'Reassigned — the new owner has been told.'**
  String get audDoneReassigned;

  /// No description provided for @audEvCreated.
  ///
  /// In en, this message translates to:
  /// **'Audit planned'**
  String get audEvCreated;

  /// No description provided for @audEvStarted.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork started'**
  String get audEvStarted;

  /// No description provided for @audEvFinding.
  ///
  /// In en, this message translates to:
  /// **'Finding recorded'**
  String get audEvFinding;

  /// No description provided for @audEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Fix submitted'**
  String get audEvSubmitted;

  /// No description provided for @audEvVerified.
  ///
  /// In en, this message translates to:
  /// **'Action verified'**
  String get audEvVerified;

  /// No description provided for @audEvReopened.
  ///
  /// In en, this message translates to:
  /// **'Action sent back'**
  String get audEvReopened;

  /// No description provided for @audEvReassigned.
  ///
  /// In en, this message translates to:
  /// **'Action reassigned'**
  String get audEvReassigned;

  /// No description provided for @audEvCompleted.
  ///
  /// In en, this message translates to:
  /// **'Fieldwork finished'**
  String get audEvCompleted;

  /// No description provided for @audEvClosed.
  ///
  /// In en, this message translates to:
  /// **'Audit closed'**
  String get audEvClosed;

  /// No description provided for @audEvCancelled.
  ///
  /// In en, this message translates to:
  /// **'Audit cancelled'**
  String get audEvCancelled;

  /// No description provided for @audEvNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get audEvNote;

  /// No description provided for @audRecommendationOptional.
  ///
  /// In en, this message translates to:
  /// **'Recommendation (optional)'**
  String get audRecommendationOptional;

  /// No description provided for @audDetail.
  ///
  /// In en, this message translates to:
  /// **'Detail'**
  String get audDetail;

  /// No description provided for @pcTitle.
  ///
  /// In en, this message translates to:
  /// **'Pool car'**
  String get pcTitle;

  /// No description provided for @pcRequestCar.
  ///
  /// In en, this message translates to:
  /// **'Request a car'**
  String get pcRequestCar;

  /// No description provided for @pcTabMine.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get pcTabMine;

  /// No description provided for @pcTabApprove.
  ///
  /// In en, this message translates to:
  /// **'To approve'**
  String get pcTabApprove;

  /// No description provided for @pcTabTrips.
  ///
  /// In en, this message translates to:
  /// **'My trips'**
  String get pcTabTrips;

  /// No description provided for @pcFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get pcFilterAll;

  /// No description provided for @pcFilterOpen.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get pcFilterOpen;

  /// No description provided for @pcFilterClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get pcFilterClosed;

  /// No description provided for @pcNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No car requests yet'**
  String get pcNoRequests;

  /// No description provided for @pcNoRequestsHint.
  ///
  /// In en, this message translates to:
  /// **'Request a pool car for an official trip. Once it is assigned you will see the driver and your gate pass here.'**
  String get pcNoRequestsHint;

  /// No description provided for @pcNoApprovals.
  ///
  /// In en, this message translates to:
  /// **'Nothing to approve'**
  String get pcNoApprovals;

  /// No description provided for @pcNoApprovalsHint.
  ///
  /// In en, this message translates to:
  /// **'Car requests from your team that name you as head of department appear here.'**
  String get pcNoApprovalsHint;

  /// No description provided for @pcNoTrips.
  ///
  /// In en, this message translates to:
  /// **'No trips assigned'**
  String get pcNoTrips;

  /// No description provided for @pcNoTripsHint.
  ///
  /// In en, this message translates to:
  /// **'Trips the fleet manager gives you appear here, with Start and Complete.'**
  String get pcNoTripsHint;

  /// No description provided for @pcUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get pcUrgent;

  /// No description provided for @pcPeople.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 person} other{{count} people}}'**
  String pcPeople(int count);

  /// No description provided for @pcSeats.
  ///
  /// In en, this message translates to:
  /// **'{count} seats'**
  String pcSeats(int count);

  /// No description provided for @pcStatusPENDING_HOD.
  ///
  /// In en, this message translates to:
  /// **'Pending HOD'**
  String get pcStatusPENDING_HOD;

  /// No description provided for @pcStatusPENDING_FLEET.
  ///
  /// In en, this message translates to:
  /// **'Pending fleet manager'**
  String get pcStatusPENDING_FLEET;

  /// No description provided for @pcStatusASSIGNED.
  ///
  /// In en, this message translates to:
  /// **'Assigned'**
  String get pcStatusASSIGNED;

  /// No description provided for @pcStatusIN_PROGRESS.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get pcStatusIN_PROGRESS;

  /// No description provided for @pcStatusCOMPLETED.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get pcStatusCOMPLETED;

  /// No description provided for @pcStatusREJECTED.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get pcStatusREJECTED;

  /// No description provided for @pcStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get pcStatusCANCELLED;

  /// No description provided for @pcTripONE_WAY.
  ///
  /// In en, this message translates to:
  /// **'One way'**
  String get pcTripONE_WAY;

  /// No description provided for @pcTripROUND_TRIP.
  ///
  /// In en, this message translates to:
  /// **'Round trip'**
  String get pcTripROUND_TRIP;

  /// No description provided for @pcTripFULL_DAY.
  ///
  /// In en, this message translates to:
  /// **'Full day'**
  String get pcTripFULL_DAY;

  /// No description provided for @pcTripAIRPORT.
  ///
  /// In en, this message translates to:
  /// **'Airport transfer'**
  String get pcTripAIRPORT;

  /// No description provided for @pcTripHintONE_WAY.
  ///
  /// In en, this message translates to:
  /// **'Drop only'**
  String get pcTripHintONE_WAY;

  /// No description provided for @pcTripHintROUND_TRIP.
  ///
  /// In en, this message translates to:
  /// **'There and back'**
  String get pcTripHintROUND_TRIP;

  /// No description provided for @pcTripHintFULL_DAY.
  ///
  /// In en, this message translates to:
  /// **'Car stays with you'**
  String get pcTripHintFULL_DAY;

  /// No description provided for @pcTripHintAIRPORT.
  ///
  /// In en, this message translates to:
  /// **'Pickup or drop'**
  String get pcTripHintAIRPORT;

  /// No description provided for @pcVehANY.
  ///
  /// In en, this message translates to:
  /// **'Any car'**
  String get pcVehANY;

  /// No description provided for @pcVehSEDAN.
  ///
  /// In en, this message translates to:
  /// **'Sedan'**
  String get pcVehSEDAN;

  /// No description provided for @pcVehSUV.
  ///
  /// In en, this message translates to:
  /// **'SUV'**
  String get pcVehSUV;

  /// No description provided for @pcVehMICROBUS.
  ///
  /// In en, this message translates to:
  /// **'Microbus'**
  String get pcVehMICROBUS;

  /// No description provided for @pcVehPICKUP.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get pcVehPICKUP;

  /// No description provided for @pcVehCOASTER.
  ///
  /// In en, this message translates to:
  /// **'Coaster'**
  String get pcVehCOASTER;

  /// No description provided for @pcFormTitle.
  ///
  /// In en, this message translates to:
  /// **'Request a pool car'**
  String get pcFormTitle;

  /// No description provided for @pcFormIntro.
  ///
  /// In en, this message translates to:
  /// **'Your head of department approves, then the fleet manager assigns a car and driver. You get the driver\'s number and a QR gate pass.'**
  String get pcFormIntro;

  /// No description provided for @pcTripKind.
  ///
  /// In en, this message translates to:
  /// **'Kind of trip'**
  String get pcTripKind;

  /// No description provided for @pcPurpose.
  ///
  /// In en, this message translates to:
  /// **'Purpose of the trip'**
  String get pcPurpose;

  /// No description provided for @pcPurposeHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Hearing at the Supreme Court'**
  String get pcPurposeHint;

  /// No description provided for @pcPickupFrom.
  ///
  /// In en, this message translates to:
  /// **'Pick up from'**
  String get pcPickupFrom;

  /// No description provided for @pcGoingTo.
  ///
  /// In en, this message translates to:
  /// **'Going to'**
  String get pcGoingTo;

  /// No description provided for @pcPickupTime.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get pcPickupTime;

  /// No description provided for @pcReturnTime.
  ///
  /// In en, this message translates to:
  /// **'Back by'**
  String get pcReturnTime;

  /// No description provided for @pcReturnOptional.
  ///
  /// In en, this message translates to:
  /// **'Back by (optional)'**
  String get pcReturnOptional;

  /// No description provided for @pcChooseTime.
  ///
  /// In en, this message translates to:
  /// **'Choose date and time'**
  String get pcChooseTime;

  /// No description provided for @pcClearReturn.
  ///
  /// In en, this message translates to:
  /// **'No return'**
  String get pcClearReturn;

  /// No description provided for @pcPassengers.
  ///
  /// In en, this message translates to:
  /// **'Passengers'**
  String get pcPassengers;

  /// No description provided for @pcAddPassenger.
  ///
  /// In en, this message translates to:
  /// **'Add passenger'**
  String get pcAddPassenger;

  /// No description provided for @pcPassengerName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get pcPassengerName;

  /// No description provided for @pcPassengerPhone.
  ///
  /// In en, this message translates to:
  /// **'Mobile (optional)'**
  String get pcPassengerPhone;

  /// No description provided for @pcRemovePassenger.
  ///
  /// In en, this message translates to:
  /// **'Remove passenger'**
  String get pcRemovePassenger;

  /// No description provided for @pcPeopleCount.
  ///
  /// In en, this message translates to:
  /// **'People travelling'**
  String get pcPeopleCount;

  /// No description provided for @pcPeopleCountHint.
  ///
  /// In en, this message translates to:
  /// **'Including you · at most {max}'**
  String pcPeopleCountHint(int max);

  /// No description provided for @pcVehiclePreference.
  ///
  /// In en, this message translates to:
  /// **'Vehicle preference'**
  String get pcVehiclePreference;

  /// No description provided for @pcUrgentHint.
  ///
  /// In en, this message translates to:
  /// **'Needed at short notice — your approver sees it first'**
  String get pcUrgentHint;

  /// No description provided for @pcApprover.
  ///
  /// In en, this message translates to:
  /// **'Approver'**
  String get pcApprover;

  /// No description provided for @pcApproverHint.
  ///
  /// In en, this message translates to:
  /// **'Your head of department'**
  String get pcApproverHint;

  /// No description provided for @pcChange.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get pcChange;

  /// No description provided for @pcNoManager.
  ///
  /// In en, this message translates to:
  /// **'No head of department on record — choose an approver'**
  String get pcNoManager;

  /// No description provided for @pcApproverNoAccount.
  ///
  /// In en, this message translates to:
  /// **'{name} cannot sign in to approve. Choose someone else.'**
  String pcApproverNoAccount(Object name);

  /// No description provided for @pcSearchApprover.
  ///
  /// In en, this message translates to:
  /// **'Search name, ID or department'**
  String get pcSearchApprover;

  /// No description provided for @pcNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No account'**
  String get pcNoAccount;

  /// No description provided for @pcSend.
  ///
  /// In en, this message translates to:
  /// **'Send for approval'**
  String get pcSend;

  /// No description provided for @pcSent.
  ///
  /// In en, this message translates to:
  /// **'{ref} sent for approval'**
  String pcSent(Object ref);

  /// No description provided for @pcPurposeRequired.
  ///
  /// In en, this message translates to:
  /// **'Say what the car is for'**
  String get pcPurposeRequired;

  /// No description provided for @pcPlacesRequired.
  ///
  /// In en, this message translates to:
  /// **'Give the pickup and drop places'**
  String get pcPlacesRequired;

  /// No description provided for @pcPickupPast.
  ///
  /// In en, this message translates to:
  /// **'The pickup time has passed'**
  String get pcPickupPast;

  /// No description provided for @pcReturnRequired.
  ///
  /// In en, this message translates to:
  /// **'Round trips and full days need a return time'**
  String get pcReturnRequired;

  /// No description provided for @pcReturnBeforePickup.
  ///
  /// In en, this message translates to:
  /// **'The return must be after the pickup'**
  String get pcReturnBeforePickup;

  /// No description provided for @pcTooManyNamed.
  ///
  /// In en, this message translates to:
  /// **'More names than people travelling'**
  String get pcTooManyNamed;

  /// No description provided for @pcApproverRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose who approves this request'**
  String get pcApproverRequired;

  /// No description provided for @pcProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get pcProgress;

  /// No description provided for @pcStepHod.
  ///
  /// In en, this message translates to:
  /// **'HOD'**
  String get pcStepHod;

  /// No description provided for @pcStepFleet.
  ///
  /// In en, this message translates to:
  /// **'Fleet'**
  String get pcStepFleet;

  /// No description provided for @pcStepAssigned.
  ///
  /// In en, this message translates to:
  /// **'Assigned'**
  String get pcStepAssigned;

  /// No description provided for @pcStepOnTrip.
  ///
  /// In en, this message translates to:
  /// **'On trip'**
  String get pcStepOnTrip;

  /// No description provided for @pcStepDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get pcStepDone;

  /// No description provided for @pcWaitingHod.
  ///
  /// In en, this message translates to:
  /// **'Waiting for {name} to approve.'**
  String pcWaitingHod(Object name);

  /// No description provided for @pcWaitingFleet.
  ///
  /// In en, this message translates to:
  /// **'Approved. The fleet manager assigns a car and driver next.'**
  String get pcWaitingFleet;

  /// No description provided for @pcTrip.
  ///
  /// In en, this message translates to:
  /// **'Trip'**
  String get pcTrip;

  /// No description provided for @pcVehicleWanted.
  ///
  /// In en, this message translates to:
  /// **'Vehicle wanted'**
  String get pcVehicleWanted;

  /// No description provided for @pcCarDriver.
  ///
  /// In en, this message translates to:
  /// **'Car & driver'**
  String get pcCarDriver;

  /// No description provided for @pcCallDriver.
  ///
  /// In en, this message translates to:
  /// **'Call driver'**
  String get pcCallDriver;

  /// No description provided for @pcDriver.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get pcDriver;

  /// No description provided for @pcNotAssignedYet.
  ///
  /// In en, this message translates to:
  /// **'A car and driver are assigned after approval. You will see the driver\'s number and your gate pass here.'**
  String get pcNotAssignedYet;

  /// No description provided for @pcNoCar.
  ///
  /// In en, this message translates to:
  /// **'No car was assigned.'**
  String get pcNoCar;

  /// No description provided for @pcGatePass.
  ///
  /// In en, this message translates to:
  /// **'Gate pass'**
  String get pcGatePass;

  /// No description provided for @pcShowPass.
  ///
  /// In en, this message translates to:
  /// **'Show gate pass'**
  String get pcShowPass;

  /// No description provided for @pcPassHint.
  ///
  /// In en, this message translates to:
  /// **'Show this at the gate. Security scans it when the car leaves and when it returns.'**
  String get pcPassHint;

  /// No description provided for @pcPassValid.
  ///
  /// In en, this message translates to:
  /// **'Valid {from} – {until}'**
  String pcPassValid(Object from, Object until);

  /// No description provided for @pcOdometerRun.
  ///
  /// In en, this message translates to:
  /// **'{start} → {end} km · {distance} km driven'**
  String pcOdometerRun(Object start, Object end, Object distance);

  /// No description provided for @pcHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get pcHistory;

  /// No description provided for @pcEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get pcEvSubmitted;

  /// No description provided for @pcEvApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved by head of department'**
  String get pcEvApproved;

  /// No description provided for @pcEvRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get pcEvRejected;

  /// No description provided for @pcEvCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get pcEvCancelled;

  /// No description provided for @pcEvAssigned.
  ///
  /// In en, this message translates to:
  /// **'Car assigned'**
  String get pcEvAssigned;

  /// No description provided for @pcEvReassigned.
  ///
  /// In en, this message translates to:
  /// **'Car changed'**
  String get pcEvReassigned;

  /// No description provided for @pcEvStarted.
  ///
  /// In en, this message translates to:
  /// **'Trip started'**
  String get pcEvStarted;

  /// No description provided for @pcEvCompleted.
  ///
  /// In en, this message translates to:
  /// **'Trip completed'**
  String get pcEvCompleted;

  /// No description provided for @pcEvExit.
  ///
  /// In en, this message translates to:
  /// **'Left through the gate'**
  String get pcEvExit;

  /// No description provided for @pcEvReturn.
  ///
  /// In en, this message translates to:
  /// **'Back through the gate'**
  String get pcEvReturn;

  /// No description provided for @pcRequestedBy.
  ///
  /// In en, this message translates to:
  /// **'Requested by'**
  String get pcRequestedBy;

  /// No description provided for @pcHod.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get pcHod;

  /// No description provided for @pcApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get pcApprove;

  /// No description provided for @pcReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get pcReject;

  /// No description provided for @pcAssign.
  ///
  /// In en, this message translates to:
  /// **'Assign car'**
  String get pcAssign;

  /// No description provided for @pcReassign.
  ///
  /// In en, this message translates to:
  /// **'Reassign'**
  String get pcReassign;

  /// No description provided for @pcStart.
  ///
  /// In en, this message translates to:
  /// **'Start trip'**
  String get pcStart;

  /// No description provided for @pcComplete.
  ///
  /// In en, this message translates to:
  /// **'Complete trip'**
  String get pcComplete;

  /// No description provided for @pcCancelRequest.
  ///
  /// In en, this message translates to:
  /// **'Cancel request'**
  String get pcCancelRequest;

  /// No description provided for @pcApproveTitle.
  ///
  /// In en, this message translates to:
  /// **'Approve this request?'**
  String get pcApproveTitle;

  /// No description provided for @pcApproveBody.
  ///
  /// In en, this message translates to:
  /// **'It goes to the fleet manager, who assigns a car and driver. The requester is told.'**
  String get pcApproveBody;

  /// No description provided for @pcRejectTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject this request'**
  String get pcRejectTitle;

  /// No description provided for @pcRejectReason.
  ///
  /// In en, this message translates to:
  /// **'Reason for the requester'**
  String get pcRejectReason;

  /// No description provided for @pcReasonRequired.
  ///
  /// In en, this message translates to:
  /// **'Give a reason of at least 3 characters'**
  String get pcReasonRequired;

  /// No description provided for @pcCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this request?'**
  String get pcCancelTitle;

  /// No description provided for @pcCancelBody.
  ///
  /// In en, this message translates to:
  /// **'The approver or fleet manager is told. An assigned car and driver are released and the gate pass stops working.'**
  String get pcCancelBody;

  /// No description provided for @pcCancelReason.
  ///
  /// In en, this message translates to:
  /// **'Reason (optional)'**
  String get pcCancelReason;

  /// No description provided for @pcOdometer.
  ///
  /// In en, this message translates to:
  /// **'Odometer reading (km, optional)'**
  String get pcOdometer;

  /// No description provided for @pcStartTitle.
  ///
  /// In en, this message translates to:
  /// **'Start the trip'**
  String get pcStartTitle;

  /// No description provided for @pcCompleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Complete the trip'**
  String get pcCompleteTitle;

  /// No description provided for @pcLastOdometer.
  ///
  /// In en, this message translates to:
  /// **'Last recorded {km} km'**
  String pcLastOdometer(Object km);

  /// No description provided for @pcApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved — sent to the fleet manager'**
  String get pcApproved;

  /// No description provided for @pcRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected — the requester has been told'**
  String get pcRejected;

  /// No description provided for @pcStarted.
  ///
  /// In en, this message translates to:
  /// **'Trip started'**
  String get pcStarted;

  /// No description provided for @pcCompleted.
  ///
  /// In en, this message translates to:
  /// **'Trip completed — the car is free again'**
  String get pcCompleted;

  /// No description provided for @pcCancelled.
  ///
  /// In en, this message translates to:
  /// **'Request cancelled'**
  String get pcCancelled;

  /// No description provided for @pcAssigned.
  ///
  /// In en, this message translates to:
  /// **'Car and driver assigned'**
  String get pcAssigned;

  /// No description provided for @pcChooseVehicle.
  ///
  /// In en, this message translates to:
  /// **'Vehicle'**
  String get pcChooseVehicle;

  /// No description provided for @pcChooseDriver.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get pcChooseDriver;

  /// No description provided for @pcFreeForTrip.
  ///
  /// In en, this message translates to:
  /// **'Free for this trip'**
  String get pcFreeForTrip;

  /// No description provided for @pcMatchesRequest.
  ///
  /// In en, this message translates to:
  /// **'Matches request'**
  String get pcMatchesRequest;

  /// No description provided for @pcReassignNote.
  ///
  /// In en, this message translates to:
  /// **'Reassigning issues a new gate pass; the old QR stops working.'**
  String get pcReassignNote;

  /// No description provided for @pcPassTitle.
  ///
  /// In en, this message translates to:
  /// **'Vehicle gate pass'**
  String get pcPassTitle;

  /// No description provided for @pcPassVALID.
  ///
  /// In en, this message translates to:
  /// **'Valid gate pass'**
  String get pcPassVALID;

  /// No description provided for @pcPassOUT.
  ///
  /// In en, this message translates to:
  /// **'Car is out on this trip'**
  String get pcPassOUT;

  /// No description provided for @pcPassUSED.
  ///
  /// In en, this message translates to:
  /// **'Trip complete — pass used'**
  String get pcPassUSED;

  /// No description provided for @pcPassCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Not valid — trip cancelled'**
  String get pcPassCANCELLED;

  /// No description provided for @pcPassEXPIRED.
  ///
  /// In en, this message translates to:
  /// **'Not valid — pass expired'**
  String get pcPassEXPIRED;

  /// No description provided for @pcPassNOT_YET_VALID.
  ///
  /// In en, this message translates to:
  /// **'Not valid yet'**
  String get pcPassNOT_YET_VALID;

  /// No description provided for @pcPassINVALID.
  ///
  /// In en, this message translates to:
  /// **'Not a valid gate pass'**
  String get pcPassINVALID;

  /// No description provided for @pcPassInvalidBody.
  ///
  /// In en, this message translates to:
  /// **'This code was not issued by ABG ONE, or it has been replaced. Do not let the vehicle through — call the fleet desk.'**
  String get pcPassInvalidBody;

  /// No description provided for @pcRecordExit.
  ///
  /// In en, this message translates to:
  /// **'Record exit'**
  String get pcRecordExit;

  /// No description provided for @pcRecordReturn.
  ///
  /// In en, this message translates to:
  /// **'Record return'**
  String get pcRecordReturn;

  /// No description provided for @pcExitRecorded.
  ///
  /// In en, this message translates to:
  /// **'Exit recorded — the trip has started'**
  String get pcExitRecorded;

  /// No description provided for @pcReturnRecorded.
  ///
  /// In en, this message translates to:
  /// **'Return recorded — the trip is complete'**
  String get pcReturnRecorded;

  /// No description provided for @pcGateRecord.
  ///
  /// In en, this message translates to:
  /// **'Gate record'**
  String get pcGateRecord;

  /// No description provided for @pcLeftGate.
  ///
  /// In en, this message translates to:
  /// **'Left the gate'**
  String get pcLeftGate;

  /// No description provided for @pcReturned.
  ///
  /// In en, this message translates to:
  /// **'Returned'**
  String get pcReturned;

  /// No description provided for @pcPassNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'Only security, front desks and the fleet manager can verify gate passes.'**
  String get pcPassNotAllowed;

  /// No description provided for @pcTravelling.
  ///
  /// In en, this message translates to:
  /// **'{count} travelling'**
  String pcTravelling(int count);

  /// No description provided for @pcValidity.
  ///
  /// In en, this message translates to:
  /// **'Pass valid'**
  String get pcValidity;

  /// No description provided for @pcLicence.
  ///
  /// In en, this message translates to:
  /// **'Licence {number}'**
  String pcLicence(Object number);

  /// No description provided for @pcRequester.
  ///
  /// In en, this message translates to:
  /// **'Requester'**
  String get pcRequester;

  /// No description provided for @navMyAbg.
  ///
  /// In en, this message translates to:
  /// **'My ABG'**
  String get navMyAbg;

  /// No description provided for @navQrScan.
  ///
  /// In en, this message translates to:
  /// **'QR Scan'**
  String get navQrScan;

  /// No description provided for @navInbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get navInbox;

  /// No description provided for @homeSeeMore.
  ///
  /// In en, this message translates to:
  /// **'See more'**
  String get homeSeeMore;

  /// No description provided for @homeSeeLess.
  ///
  /// In en, this message translates to:
  /// **'See less'**
  String get homeSeeLess;

  /// No description provided for @homeSearchTooltip.
  ///
  /// In en, this message translates to:
  /// **'Search services'**
  String get homeSearchTooltip;

  /// No description provided for @homeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search services, e.g. pool car'**
  String get homeSearchHint;

  /// No description provided for @homeSearchEmpty.
  ///
  /// In en, this message translates to:
  /// **'No service matches “{query}”'**
  String homeSearchEmpty(Object query);

  /// No description provided for @homeSearchParcels.
  ///
  /// In en, this message translates to:
  /// **'Search parcels by tracking ID'**
  String get homeSearchParcels;

  /// No description provided for @homeMenuTooltip.
  ///
  /// In en, this message translates to:
  /// **'My ABG'**
  String get homeMenuTooltip;

  /// No description provided for @homeGlance.
  ///
  /// In en, this message translates to:
  /// **'At a glance'**
  String get homeGlance;

  /// No description provided for @homeParcelsSection.
  ///
  /// In en, this message translates to:
  /// **'Parcels'**
  String get homeParcelsSection;

  /// No description provided for @svcAppointment.
  ///
  /// In en, this message translates to:
  /// **'Request for Appointment'**
  String get svcAppointment;

  /// No description provided for @svcIncidentRecord.
  ///
  /// In en, this message translates to:
  /// **'Incident record'**
  String get svcIncidentRecord;

  /// No description provided for @svcRegulatory.
  ///
  /// In en, this message translates to:
  /// **'Regulatory Affairs'**
  String get svcRegulatory;

  /// No description provided for @svcAudit.
  ///
  /// In en, this message translates to:
  /// **'Audit'**
  String get svcAudit;

  /// No description provided for @svcOfficeParcel.
  ///
  /// In en, this message translates to:
  /// **'Office parcel'**
  String get svcOfficeParcel;

  /// No description provided for @svcVisitorManagement.
  ///
  /// In en, this message translates to:
  /// **'Visitor Management'**
  String get svcVisitorManagement;

  /// No description provided for @svcLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave apply'**
  String get svcLeave;

  /// No description provided for @svcPoolCarRequest.
  ///
  /// In en, this message translates to:
  /// **'Pool car request'**
  String get svcPoolCarRequest;

  /// No description provided for @svcTours.
  ///
  /// In en, this message translates to:
  /// **'Tour request'**
  String get svcTours;

  /// No description provided for @svcNotices.
  ///
  /// In en, this message translates to:
  /// **'Notice board'**
  String get svcNotices;

  /// No description provided for @svcApprovals.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get svcApprovals;

  /// No description provided for @svcScan.
  ///
  /// In en, this message translates to:
  /// **'Scan & receive'**
  String get svcScan;

  /// No description provided for @svcMyTrips.
  ///
  /// In en, this message translates to:
  /// **'My trips'**
  String get svcMyTrips;

  /// No description provided for @glanceWaiting.
  ///
  /// In en, this message translates to:
  /// **'Parcels waiting'**
  String get glanceWaiting;

  /// No description provided for @glanceInTransit.
  ///
  /// In en, this message translates to:
  /// **'In transit'**
  String get glanceInTransit;

  /// No description provided for @glanceApprovals.
  ///
  /// In en, this message translates to:
  /// **'To approve'**
  String get glanceApprovals;

  /// No description provided for @glanceReports.
  ///
  /// In en, this message translates to:
  /// **'Open reports'**
  String get glanceReports;

  /// No description provided for @glanceNotices.
  ///
  /// In en, this message translates to:
  /// **'Unread notices'**
  String get glanceNotices;

  /// No description provided for @bannerRead.
  ///
  /// In en, this message translates to:
  /// **'Read'**
  String get bannerRead;

  /// No description provided for @bannerUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get bannerUrgent;

  /// No description provided for @bannerPinned.
  ///
  /// In en, this message translates to:
  /// **'Pinned'**
  String get bannerPinned;

  /// No description provided for @bannerStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get bannerStart;

  /// No description provided for @homeChannelCHAIRMAN.
  ///
  /// In en, this message translates to:
  /// **'Chairman'**
  String get homeChannelCHAIRMAN;

  /// No description provided for @homeChannelMANAGING_DIRECTOR.
  ///
  /// In en, this message translates to:
  /// **'Managing Director'**
  String get homeChannelMANAGING_DIRECTOR;

  /// No description provided for @homeChannelHR.
  ///
  /// In en, this message translates to:
  /// **'Human Resources'**
  String get homeChannelHR;

  /// No description provided for @homeChannelADMINISTRATION.
  ///
  /// In en, this message translates to:
  /// **'Administration'**
  String get homeChannelADMINISTRATION;

  /// No description provided for @homeChannelCOMPLIANCE.
  ///
  /// In en, this message translates to:
  /// **'Compliance'**
  String get homeChannelCOMPLIANCE;

  /// No description provided for @homeChannelIT.
  ///
  /// In en, this message translates to:
  /// **'IT'**
  String get homeChannelIT;

  /// No description provided for @promoCarTitle.
  ///
  /// In en, this message translates to:
  /// **'Need a car for official work?'**
  String get promoCarTitle;

  /// No description provided for @promoCarBody.
  ///
  /// In en, this message translates to:
  /// **'Request a pool car — your head of department approves in one tap.'**
  String get promoCarBody;

  /// No description provided for @promoIssueTitle.
  ///
  /// In en, this message translates to:
  /// **'See something unsafe or broken?'**
  String get promoIssueTitle;

  /// No description provided for @promoIssueBody.
  ///
  /// In en, this message translates to:
  /// **'Snap a photo and report it. The admin team is told at once.'**
  String get promoIssueBody;

  /// No description provided for @promoVisitorTitle.
  ///
  /// In en, this message translates to:
  /// **'Expecting a guest?'**
  String get promoVisitorTitle;

  /// No description provided for @promoVisitorBody.
  ///
  /// In en, this message translates to:
  /// **'Send them a gate pass before they arrive — no waiting at the gate.'**
  String get promoVisitorBody;

  /// No description provided for @myRequests.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get myRequests;

  /// No description provided for @myTours.
  ///
  /// In en, this message translates to:
  /// **'My tour requests'**
  String get myTours;

  /// No description provided for @myCars.
  ///
  /// In en, this message translates to:
  /// **'My pool car requests'**
  String get myCars;

  /// No description provided for @myVisitors.
  ///
  /// In en, this message translates to:
  /// **'My visitors'**
  String get myVisitors;

  /// No description provided for @myApprovals.
  ///
  /// In en, this message translates to:
  /// **'Waiting for my approval'**
  String get myApprovals;

  /// No description provided for @incModuleTitle.
  ///
  /// In en, this message translates to:
  /// **'Incident & Facility Issues'**
  String get incModuleTitle;

  /// No description provided for @incReport.
  ///
  /// In en, this message translates to:
  /// **'Report an incident'**
  String get incReport;

  /// No description provided for @incReportHint.
  ///
  /// In en, this message translates to:
  /// **'Safety, facility, security or IT problem? Snap a photo — the right team is told at once.'**
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

  /// No description provided for @incStepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {step} of {total}'**
  String incStepOf(int step, int total);

  /// No description provided for @incChooseGroup.
  ///
  /// In en, this message translates to:
  /// **'What kind of problem is it?'**
  String get incChooseGroup;

  /// No description provided for @incChooseGroupHint.
  ///
  /// In en, this message translates to:
  /// **'Pick one of the four categories. You choose the exact problem next.'**
  String get incChooseGroupHint;

  /// No description provided for @incChooseCategory.
  ///
  /// In en, this message translates to:
  /// **'Which one fits best?'**
  String get incChooseCategory;

  /// No description provided for @incChangeGroup.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get incChangeGroup;

  /// No description provided for @incTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get incTitleLabel;

  /// No description provided for @incTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Strong smell of gas near the boiler room'**
  String get incTitleHint;

  /// No description provided for @incDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'What did you see? (optional)'**
  String get incDescriptionLabel;

  /// No description provided for @incPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get incPhotos;

  /// No description provided for @incPhotosHint.
  ///
  /// In en, this message translates to:
  /// **'Add up to 3 photos. A clear photo helps the team act faster.'**
  String get incPhotosHint;

  /// No description provided for @incPhotoCount.
  ///
  /// In en, this message translates to:
  /// **'{count} of {max} added'**
  String incPhotoCount(int count, int max);

  /// No description provided for @incPhotoPreview.
  ///
  /// In en, this message translates to:
  /// **'Photo {number}'**
  String incPhotoPreview(int number);

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

  /// No description provided for @incSeverity.
  ///
  /// In en, this message translates to:
  /// **'Severity'**
  String get incSeverity;

  /// No description provided for @incPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get incPrivacy;

  /// No description provided for @incConfidential.
  ///
  /// In en, this message translates to:
  /// **'Confidential report'**
  String get incConfidential;

  /// No description provided for @incConfidentialHint.
  ///
  /// In en, this message translates to:
  /// **'Goes to Head Office only — never to your own office\'s admins — and your name is hidden from everyone handling it.'**
  String get incConfidentialHint;

  /// No description provided for @incConfidentialForced.
  ///
  /// In en, this message translates to:
  /// **'Misconduct reports are always confidential and go to Head Office only.'**
  String get incConfidentialForced;

  /// No description provided for @incAnonymous.
  ///
  /// In en, this message translates to:
  /// **'Report anonymously'**
  String get incAnonymous;

  /// No description provided for @incAnonymousHint.
  ///
  /// In en, this message translates to:
  /// **'Your office\'s admins still handle it, but won\'t see your name. It is kept only so you can follow the stages.'**
  String get incAnonymousHint;

  /// No description provided for @incSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get incSubmit;

  /// No description provided for @incSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Report {ref} sent. The team has been notified.'**
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

  /// No description provided for @incOfflineNotice.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline. Reports with photos need a connection — try again when you\'re back online.'**
  String get incOfflineNotice;

  /// No description provided for @incGrpSAFETY_INDUSTRIAL.
  ///
  /// In en, this message translates to:
  /// **'Safety & Industrial'**
  String get incGrpSAFETY_INDUSTRIAL;

  /// No description provided for @incGrpADMIN_FACILITY.
  ///
  /// In en, this message translates to:
  /// **'Admin & Facility'**
  String get incGrpADMIN_FACILITY;

  /// No description provided for @incGrpSECURITY.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get incGrpSECURITY;

  /// No description provided for @incGrpIT_TECHNICAL.
  ///
  /// In en, this message translates to:
  /// **'IT / Technical'**
  String get incGrpIT_TECHNICAL;

  /// No description provided for @incGrpHintSAFETY_INDUSTRIAL.
  ///
  /// In en, this message translates to:
  /// **'Fire, gas, chemicals, injuries, electrical, machinery, PPE'**
  String get incGrpHintSAFETY_INDUSTRIAL;

  /// No description provided for @incGrpHintADMIN_FACILITY.
  ///
  /// In en, this message translates to:
  /// **'Building, cleaning, cafeteria, washrooms, water, AC, furniture'**
  String get incGrpHintADMIN_FACILITY;

  /// No description provided for @incGrpHintSECURITY.
  ///
  /// In en, this message translates to:
  /// **'Access, theft, CCTV, gates and locks, misconduct'**
  String get incGrpHintSECURITY;

  /// No description provided for @incGrpHintIT_TECHNICAL.
  ///
  /// In en, this message translates to:
  /// **'Network, computers, software, phones, power and UPS'**
  String get incGrpHintIT_TECHNICAL;

  /// No description provided for @incCatFIRE_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Fire hazard'**
  String get incCatFIRE_HAZARD;

  /// No description provided for @incCatGAS_LEAK.
  ///
  /// In en, this message translates to:
  /// **'Gas leak'**
  String get incCatGAS_LEAK;

  /// No description provided for @incCatCHEMICAL_SPILL.
  ///
  /// In en, this message translates to:
  /// **'Chemical spill'**
  String get incCatCHEMICAL_SPILL;

  /// No description provided for @incCatINJURY_NEAR_MISS.
  ///
  /// In en, this message translates to:
  /// **'Injury or near miss'**
  String get incCatINJURY_NEAR_MISS;

  /// No description provided for @incCatELECTRICAL_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Electrical hazard'**
  String get incCatELECTRICAL_HAZARD;

  /// No description provided for @incCatMACHINERY_FAULT.
  ///
  /// In en, this message translates to:
  /// **'Machinery fault'**
  String get incCatMACHINERY_FAULT;

  /// No description provided for @incCatPPE_VIOLATION.
  ///
  /// In en, this message translates to:
  /// **'PPE violation'**
  String get incCatPPE_VIOLATION;

  /// No description provided for @incCatSAFETY_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Other safety hazard'**
  String get incCatSAFETY_HAZARD;

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

  /// No description provided for @incCatWATER_SUPPLY.
  ///
  /// In en, this message translates to:
  /// **'Water supply'**
  String get incCatWATER_SUPPLY;

  /// No description provided for @incCatAC_VENTILATION.
  ///
  /// In en, this message translates to:
  /// **'AC & ventilation'**
  String get incCatAC_VENTILATION;

  /// No description provided for @incCatFURNITURE_FIXTURES.
  ///
  /// In en, this message translates to:
  /// **'Furniture & fixtures'**
  String get incCatFURNITURE_FIXTURES;

  /// No description provided for @incCatPEST_CONTROL.
  ///
  /// In en, this message translates to:
  /// **'Pest control'**
  String get incCatPEST_CONTROL;

  /// No description provided for @incCatOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other facility issue'**
  String get incCatOTHER;

  /// No description provided for @incCatUNAUTHORISED_ACCESS.
  ///
  /// In en, this message translates to:
  /// **'Unauthorised access'**
  String get incCatUNAUTHORISED_ACCESS;

  /// No description provided for @incCatTHEFT_LOSS.
  ///
  /// In en, this message translates to:
  /// **'Theft or loss'**
  String get incCatTHEFT_LOSS;

  /// No description provided for @incCatCCTV_FAULT.
  ///
  /// In en, this message translates to:
  /// **'CCTV fault'**
  String get incCatCCTV_FAULT;

  /// No description provided for @incCatGATE_LOCK.
  ///
  /// In en, this message translates to:
  /// **'Gate or lock'**
  String get incCatGATE_LOCK;

  /// No description provided for @incCatMISCONDUCT.
  ///
  /// In en, this message translates to:
  /// **'Misconduct'**
  String get incCatMISCONDUCT;

  /// No description provided for @incCatNETWORK_DOWN.
  ///
  /// In en, this message translates to:
  /// **'Network down'**
  String get incCatNETWORK_DOWN;

  /// No description provided for @incCatCOMPUTER_PRINTER.
  ///
  /// In en, this message translates to:
  /// **'Computer or printer'**
  String get incCatCOMPUTER_PRINTER;

  /// No description provided for @incCatSOFTWARE_ACCESS.
  ///
  /// In en, this message translates to:
  /// **'Software or access'**
  String get incCatSOFTWARE_ACCESS;

  /// No description provided for @incCatTELEPHONE.
  ///
  /// In en, this message translates to:
  /// **'Telephone / PABX'**
  String get incCatTELEPHONE;

  /// No description provided for @incCatPOWER_UPS.
  ///
  /// In en, this message translates to:
  /// **'Power or UPS'**
  String get incCatPOWER_UPS;

  /// No description provided for @incCatHintFIRE_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Smoke, sparks, blocked fire exits, missing or expired extinguishers'**
  String get incCatHintFIRE_HAZARD;

  /// No description provided for @incCatHintGAS_LEAK.
  ///
  /// In en, this message translates to:
  /// **'Smell of gas, hissing pipes or cylinders, faulty gas lines'**
  String get incCatHintGAS_LEAK;

  /// No description provided for @incCatHintCHEMICAL_SPILL.
  ///
  /// In en, this message translates to:
  /// **'Spilled or leaking chemicals, dyes, oil or fuel'**
  String get incCatHintCHEMICAL_SPILL;

  /// No description provided for @incCatHintINJURY_NEAR_MISS.
  ///
  /// In en, this message translates to:
  /// **'Someone was hurt at work, or very nearly was'**
  String get incCatHintINJURY_NEAR_MISS;

  /// No description provided for @incCatHintELECTRICAL_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Exposed wiring, sparking sockets, overloaded or open switchboards'**
  String get incCatHintELECTRICAL_HAZARD;

  /// No description provided for @incCatHintMACHINERY_FAULT.
  ///
  /// In en, this message translates to:
  /// **'Unsafe or broken machines, missing guards, unusual noise or smoke'**
  String get incCatHintMACHINERY_FAULT;

  /// No description provided for @incCatHintPPE_VIOLATION.
  ///
  /// In en, this message translates to:
  /// **'Helmets, gloves, masks or harnesses not worn or not available'**
  String get incCatHintPPE_VIOLATION;

  /// No description provided for @incCatHintSAFETY_HAZARD.
  ///
  /// In en, this message translates to:
  /// **'Wet floors, trip hazards, blocked walkways, unsafe heights'**
  String get incCatHintSAFETY_HAZARD;

  /// No description provided for @incCatHintBUILDING_DAMAGE.
  ///
  /// In en, this message translates to:
  /// **'Cracked or fallen walls and ceilings, leaks, broken doors or windows'**
  String get incCatHintBUILDING_DAMAGE;

  /// No description provided for @incCatHintCLEANLINESS.
  ///
  /// In en, this message translates to:
  /// **'Dirty floors, corridors and stairs, overflowing bins'**
  String get incCatHintCLEANLINESS;

  /// No description provided for @incCatHintCAFETERIA_HYGIENE.
  ///
  /// In en, this message translates to:
  /// **'Unclean kitchen or serving area, food safety'**
  String get incCatHintCAFETERIA_HYGIENE;

  /// No description provided for @incCatHintWASHROOM.
  ///
  /// In en, this message translates to:
  /// **'Unclean washroom, no soap or tissue, blocked drains'**
  String get incCatHintWASHROOM;

  /// No description provided for @incCatHintWATER_SUPPLY.
  ///
  /// In en, this message translates to:
  /// **'No water, low pressure, dirty or unsafe drinking water'**
  String get incCatHintWATER_SUPPLY;

  /// No description provided for @incCatHintAC_VENTILATION.
  ///
  /// In en, this message translates to:
  /// **'AC not cooling or leaking, fans not working, stuffy rooms'**
  String get incCatHintAC_VENTILATION;

  /// No description provided for @incCatHintFURNITURE_FIXTURES.
  ///
  /// In en, this message translates to:
  /// **'Broken chairs, desks or cabinets, lights or fittings'**
  String get incCatHintFURNITURE_FIXTURES;

  /// No description provided for @incCatHintPEST_CONTROL.
  ///
  /// In en, this message translates to:
  /// **'Rats, cockroaches, mosquitoes or termites'**
  String get incCatHintPEST_CONTROL;

  /// No description provided for @incCatHintOTHER.
  ///
  /// In en, this message translates to:
  /// **'Anything else the admin team should look at'**
  String get incCatHintOTHER;

  /// No description provided for @incCatHintUNAUTHORISED_ACCESS.
  ///
  /// In en, this message translates to:
  /// **'Unknown person inside, tailgating, misuse of ID cards'**
  String get incCatHintUNAUTHORISED_ACCESS;

  /// No description provided for @incCatHintTHEFT_LOSS.
  ///
  /// In en, this message translates to:
  /// **'Missing equipment, stock, documents or belongings'**
  String get incCatHintTHEFT_LOSS;

  /// No description provided for @incCatHintCCTV_FAULT.
  ///
  /// In en, this message translates to:
  /// **'Camera offline, blind spot, recorder not working'**
  String get incCatHintCCTV_FAULT;

  /// No description provided for @incCatHintGATE_LOCK.
  ///
  /// In en, this message translates to:
  /// **'Unattended gate, broken lock, faulty barrier or access door'**
  String get incCatHintGATE_LOCK;

  /// No description provided for @incCatHintMISCONDUCT.
  ///
  /// In en, this message translates to:
  /// **'Harassment, bribery, fraud or other wrongdoing — always confidential'**
  String get incCatHintMISCONDUCT;

  /// No description provided for @incCatHintNETWORK_DOWN.
  ///
  /// In en, this message translates to:
  /// **'No internet, Wi-Fi or LAN outage, very slow connection'**
  String get incCatHintNETWORK_DOWN;

  /// No description provided for @incCatHintCOMPUTER_PRINTER.
  ///
  /// In en, this message translates to:
  /// **'PC, laptop, printer or scanner not working'**
  String get incCatHintCOMPUTER_PRINTER;

  /// No description provided for @incCatHintSOFTWARE_ACCESS.
  ///
  /// In en, this message translates to:
  /// **'ERP, email or app errors, password or permission problems'**
  String get incCatHintSOFTWARE_ACCESS;

  /// No description provided for @incCatHintTELEPHONE.
  ///
  /// In en, this message translates to:
  /// **'Desk phone, PABX or intercom not working'**
  String get incCatHintTELEPHONE;

  /// No description provided for @incCatHintPOWER_UPS.
  ///
  /// In en, this message translates to:
  /// **'Power cut, UPS or generator failure, voltage problems'**
  String get incCatHintPOWER_UPS;

  /// No description provided for @incSevCRITICAL.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get incSevCRITICAL;

  /// No description provided for @incSevHIGH.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get incSevHIGH;

  /// No description provided for @incSevMEDIUM.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get incSevMEDIUM;

  /// No description provided for @incSevLOW.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get incSevLOW;

  /// No description provided for @incSevHintCRITICAL.
  ///
  /// In en, this message translates to:
  /// **'Danger to people, or work has stopped — act now'**
  String get incSevHintCRITICAL;

  /// No description provided for @incSevHintHIGH.
  ///
  /// In en, this message translates to:
  /// **'Serious; needs action today'**
  String get incSevHintHIGH;

  /// No description provided for @incSevHintMEDIUM.
  ///
  /// In en, this message translates to:
  /// **'Needs fixing soon'**
  String get incSevHintMEDIUM;

  /// No description provided for @incSevHintLOW.
  ///
  /// In en, this message translates to:
  /// **'Minor; fix when convenient'**
  String get incSevHintLOW;

  /// No description provided for @incStatusREPORTED.
  ///
  /// In en, this message translates to:
  /// **'Reported'**
  String get incStatusREPORTED;

  /// No description provided for @incStatusACKNOWLEDGED.
  ///
  /// In en, this message translates to:
  /// **'Acknowledged'**
  String get incStatusACKNOWLEDGED;

  /// No description provided for @incStatusUNDER_INVESTIGATION.
  ///
  /// In en, this message translates to:
  /// **'Under Investigation'**
  String get incStatusUNDER_INVESTIGATION;

  /// No description provided for @incStatusCLOSED.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get incStatusCLOSED;

  /// No description provided for @incProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get incProgress;

  /// No description provided for @incStageSkipped.
  ///
  /// In en, this message translates to:
  /// **'Skipped'**
  String get incStageSkipped;

  /// No description provided for @incStageNow.
  ///
  /// In en, this message translates to:
  /// **'Now'**
  String get incStageNow;

  /// No description provided for @incWaitingForAdmin.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the team to acknowledge it.'**
  String get incWaitingForAdmin;

  /// No description provided for @incResRESOLVED.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get incResRESOLVED;

  /// No description provided for @incResNO_ACTION_NEEDED.
  ///
  /// In en, this message translates to:
  /// **'No action needed'**
  String get incResNO_ACTION_NEEDED;

  /// No description provided for @incResDUPLICATE.
  ///
  /// In en, this message translates to:
  /// **'Duplicate'**
  String get incResDUPLICATE;

  /// No description provided for @incResREFERRED.
  ///
  /// In en, this message translates to:
  /// **'Referred'**
  String get incResREFERRED;

  /// No description provided for @incResHintRESOLVED.
  ///
  /// In en, this message translates to:
  /// **'The problem has been fixed.'**
  String get incResHintRESOLVED;

  /// No description provided for @incResHintNO_ACTION_NEEDED.
  ///
  /// In en, this message translates to:
  /// **'The team checked and nothing needs to be done.'**
  String get incResHintNO_ACTION_NEEDED;

  /// No description provided for @incResHintDUPLICATE.
  ///
  /// In en, this message translates to:
  /// **'It was already reported and is being handled under that report.'**
  String get incResHintDUPLICATE;

  /// No description provided for @incResHintREFERRED.
  ///
  /// In en, this message translates to:
  /// **'It has been passed to another authority or department.'**
  String get incResHintREFERRED;

  /// No description provided for @incResolution.
  ///
  /// In en, this message translates to:
  /// **'Resolution'**
  String get incResolution;

  /// No description provided for @incClosedAs.
  ///
  /// In en, this message translates to:
  /// **'Closed as {resolution}'**
  String incClosedAs(Object resolution);

  /// No description provided for @incFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get incFilterAll;

  /// No description provided for @incFilterOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get incFilterOpen;

  /// No description provided for @incNoReports.
  ///
  /// In en, this message translates to:
  /// **'No reports yet'**
  String get incNoReports;

  /// No description provided for @incNoReportsHint.
  ///
  /// In en, this message translates to:
  /// **'When you report a problem, you can follow every stage here.'**
  String get incNoReportsHint;

  /// No description provided for @incNoReportsFilter.
  ///
  /// In en, this message translates to:
  /// **'No reports at this stage.'**
  String get incNoReportsFilter;

  /// No description provided for @incAdminUpdate.
  ///
  /// In en, this message translates to:
  /// **'Update from the team'**
  String get incAdminUpdate;

  /// No description provided for @incReportedBy.
  ///
  /// In en, this message translates to:
  /// **'Reported by'**
  String get incReportedBy;

  /// No description provided for @incReportedOn.
  ///
  /// In en, this message translates to:
  /// **'Reported'**
  String get incReportedOn;

  /// No description provided for @incAnonymousBadge.
  ///
  /// In en, this message translates to:
  /// **'Anonymous'**
  String get incAnonymousBadge;

  /// No description provided for @incConfidentialBadge.
  ///
  /// In en, this message translates to:
  /// **'Confidential'**
  String get incConfidentialBadge;

  /// No description provided for @incConfidentialDetail.
  ///
  /// In en, this message translates to:
  /// **'Confidential: handled by Head Office only. Your name is hidden from everyone handling it.'**
  String get incConfidentialDetail;

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

  /// No description provided for @incEvAcknowledged.
  ///
  /// In en, this message translates to:
  /// **'Acknowledged'**
  String get incEvAcknowledged;

  /// No description provided for @incEvInvestigation.
  ///
  /// In en, this message translates to:
  /// **'Investigation started'**
  String get incEvInvestigation;

  /// No description provided for @incEvClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed — {resolution}'**
  String incEvClosed(Object resolution);

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

  /// No description provided for @kitNoHistory.
  ///
  /// In en, this message translates to:
  /// **'Nothing recorded yet.'**
  String get kitNoHistory;

  /// No description provided for @kitReasonRequired.
  ///
  /// In en, this message translates to:
  /// **'Please give a short reason.'**
  String get kitReasonRequired;

  /// No description provided for @kitReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get kitReason;

  /// No description provided for @kitNoteOptional.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get kitNoteOptional;

  /// No description provided for @kitNoteLabel.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get kitNoteLabel;

  /// No description provided for @kitSearchPeople.
  ///
  /// In en, this message translates to:
  /// **'Search by name, ID or designation'**
  String get kitSearchPeople;

  /// No description provided for @kitTypeToSearch.
  ///
  /// In en, this message translates to:
  /// **'Type at least two letters to search the staff directory.'**
  String get kitTypeToSearch;

  /// No description provided for @kitNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No one matches that search.'**
  String get kitNoMatches;

  /// No description provided for @kitNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No app account'**
  String get kitNoAccount;

  /// No description provided for @kitChange.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get kitChange;

  /// No description provided for @kitChoose.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get kitChoose;

  /// No description provided for @kitRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get kitRemove;

  /// No description provided for @kitProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get kitProgress;

  /// No description provided for @kitHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get kitHistory;

  /// No description provided for @kitAddNote.
  ///
  /// In en, this message translates to:
  /// **'Add a note'**
  String get kitAddNote;

  /// No description provided for @kitAddNoteHint.
  ///
  /// In en, this message translates to:
  /// **'Everyone on this request can read it.'**
  String get kitAddNoteHint;

  /// No description provided for @kitNoteAdded.
  ///
  /// In en, this message translates to:
  /// **'Note added.'**
  String get kitNoteAdded;

  /// No description provided for @kitLatestNote.
  ///
  /// In en, this message translates to:
  /// **'Latest note'**
  String get kitLatestNote;

  /// No description provided for @kitAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get kitAll;

  /// No description provided for @kitOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get kitOpen;

  /// No description provided for @kitClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get kitClosed;

  /// No description provided for @kitOffice.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get kitOffice;

  /// No description provided for @kitOfflineNotice.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Nothing was sent — try again when you are connected.'**
  String get kitOfflineNotice;

  /// No description provided for @lvTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get lvTitle;

  /// No description provided for @lvApply.
  ///
  /// In en, this message translates to:
  /// **'Apply for leave'**
  String get lvApply;

  /// No description provided for @lvMyLeave.
  ///
  /// In en, this message translates to:
  /// **'My leave'**
  String get lvMyLeave;

  /// No description provided for @lvToApprove.
  ///
  /// In en, this message translates to:
  /// **'To approve'**
  String get lvToApprove;

  /// No description provided for @lvBalanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Your balance · {year}'**
  String lvBalanceTitle(Object year);

  /// No description provided for @lvLeft.
  ///
  /// In en, this message translates to:
  /// **'left'**
  String get lvLeft;

  /// No description provided for @lvOfTotal.
  ///
  /// In en, this message translates to:
  /// **'of {total}'**
  String lvOfTotal(Object total);

  /// No description provided for @lvTakenPending.
  ///
  /// In en, this message translates to:
  /// **'{taken} taken · {pending} pending'**
  String lvTakenPending(Object taken, Object pending);

  /// No description provided for @lvTaken.
  ///
  /// In en, this message translates to:
  /// **'{taken} taken'**
  String lvTaken(Object taken);

  /// No description provided for @lvNoLimit.
  ///
  /// In en, this message translates to:
  /// **'No yearly limit'**
  String get lvNoLimit;

  /// No description provided for @lvAdjusted.
  ///
  /// In en, this message translates to:
  /// **'Set by HR'**
  String get lvAdjusted;

  /// No description provided for @lvNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No leave applications yet'**
  String get lvNoRequests;

  /// No description provided for @lvNoRequestsHint.
  ///
  /// In en, this message translates to:
  /// **'Apply for casual, sick, earned or other leave. Your head of department and HR approve it here.'**
  String get lvNoRequestsHint;

  /// No description provided for @lvNothingToApprove.
  ///
  /// In en, this message translates to:
  /// **'Nothing waiting for you'**
  String get lvNothingToApprove;

  /// No description provided for @lvNothingToApproveHint.
  ///
  /// In en, this message translates to:
  /// **'Leave applications from your team appear here for your approval.'**
  String get lvNothingToApproveHint;

  /// No description provided for @lvWaitingCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 application is waiting for you} other{{count} applications are waiting for you}}'**
  String lvWaitingCount(int count);

  /// No description provided for @lvTeamAway.
  ///
  /// In en, this message translates to:
  /// **'Your team away · next 30 days'**
  String get lvTeamAway;

  /// No description provided for @lvTeamNobody.
  ///
  /// In en, this message translates to:
  /// **'No one in your team is away in the next 30 days.'**
  String get lvTeamNobody;

  /// No description provided for @lvOnLeaveNow.
  ///
  /// In en, this message translates to:
  /// **'On leave today'**
  String get lvOnLeaveNow;

  /// No description provided for @lvOnLeaveBanner.
  ///
  /// In en, this message translates to:
  /// **'You are on leave today ({ref}). Enjoy the time off.'**
  String lvOnLeaveBanner(Object ref);

  /// No description provided for @lvHalfDayCount.
  ///
  /// In en, this message translates to:
  /// **'½ day'**
  String get lvHalfDayCount;

  /// No description provided for @lvDayCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 day} other{{count} days}}'**
  String lvDayCount(int count);

  /// No description provided for @lvDaysDecimal.
  ///
  /// In en, this message translates to:
  /// **'{days} days'**
  String lvDaysDecimal(Object days);

  /// No description provided for @lvTypeCASUAL.
  ///
  /// In en, this message translates to:
  /// **'Casual leave'**
  String get lvTypeCASUAL;

  /// No description provided for @lvTypeSICK.
  ///
  /// In en, this message translates to:
  /// **'Sick leave'**
  String get lvTypeSICK;

  /// No description provided for @lvTypeEARNED.
  ///
  /// In en, this message translates to:
  /// **'Earned leave'**
  String get lvTypeEARNED;

  /// No description provided for @lvTypeMATERNITY.
  ///
  /// In en, this message translates to:
  /// **'Maternity leave'**
  String get lvTypeMATERNITY;

  /// No description provided for @lvTypePATERNITY.
  ///
  /// In en, this message translates to:
  /// **'Paternity leave'**
  String get lvTypePATERNITY;

  /// No description provided for @lvTypeUNPAID.
  ///
  /// In en, this message translates to:
  /// **'Leave without pay'**
  String get lvTypeUNPAID;

  /// No description provided for @lvHintCASUAL.
  ///
  /// In en, this message translates to:
  /// **'10 days a year · up to 3 days at a time'**
  String get lvHintCASUAL;

  /// No description provided for @lvHintSICK.
  ///
  /// In en, this message translates to:
  /// **'14 days a year · medical certificate for more than 2 days'**
  String get lvHintSICK;

  /// No description provided for @lvHintEARNED.
  ///
  /// In en, this message translates to:
  /// **'18 days a year · apply at least 3 days ahead'**
  String get lvHintEARNED;

  /// No description provided for @lvHintMATERNITY.
  ///
  /// In en, this message translates to:
  /// **'16 weeks, counted in calendar days'**
  String get lvHintMATERNITY;

  /// No description provided for @lvHintPATERNITY.
  ///
  /// In en, this message translates to:
  /// **'5 working days around the birth'**
  String get lvHintPATERNITY;

  /// No description provided for @lvHintUNPAID.
  ///
  /// In en, this message translates to:
  /// **'No balance · up to 30 days, apply 3 days ahead'**
  String get lvHintUNPAID;

  /// No description provided for @lvStatusPENDING_HOD.
  ///
  /// In en, this message translates to:
  /// **'Pending HOD approval'**
  String get lvStatusPENDING_HOD;

  /// No description provided for @lvStatusPENDING_HR.
  ///
  /// In en, this message translates to:
  /// **'Pending HR approval'**
  String get lvStatusPENDING_HR;

  /// No description provided for @lvStatusAPPROVED.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get lvStatusAPPROVED;

  /// No description provided for @lvStatusREJECTED.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get lvStatusREJECTED;

  /// No description provided for @lvStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get lvStatusCANCELLED;

  /// No description provided for @lvStageSUBMITTED.
  ///
  /// In en, this message translates to:
  /// **'Applied'**
  String get lvStageSUBMITTED;

  /// No description provided for @lvStagePENDING_HOD.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get lvStagePENDING_HOD;

  /// No description provided for @lvStagePENDING_HR.
  ///
  /// In en, this message translates to:
  /// **'HR'**
  String get lvStagePENDING_HR;

  /// No description provided for @lvStageAPPROVED.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get lvStageAPPROVED;

  /// No description provided for @lvStageCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get lvStageCANCELLED;

  /// No description provided for @lvWaitingFor.
  ///
  /// In en, this message translates to:
  /// **'Waiting for {name}'**
  String lvWaitingFor(Object name);

  /// No description provided for @lvStageRejectedBy.
  ///
  /// In en, this message translates to:
  /// **'Rejected by {name}'**
  String lvStageRejectedBy(Object name);

  /// No description provided for @lvStageCancelledBy.
  ///
  /// In en, this message translates to:
  /// **'Cancelled by {name}'**
  String lvStageCancelledBy(Object name);

  /// No description provided for @lvStageSkipped.
  ///
  /// In en, this message translates to:
  /// **'Not needed'**
  String get lvStageSkipped;

  /// No description provided for @lvAwaitingHOD.
  ///
  /// In en, this message translates to:
  /// **'Your approval as head of department'**
  String get lvAwaitingHOD;

  /// No description provided for @lvAwaitingHR.
  ///
  /// In en, this message translates to:
  /// **'HR approval'**
  String get lvAwaitingHR;

  /// No description provided for @lvHalfDay.
  ///
  /// In en, this message translates to:
  /// **'Half day'**
  String get lvHalfDay;

  /// No description provided for @lvFIRST_HALF.
  ///
  /// In en, this message translates to:
  /// **'First half (morning)'**
  String get lvFIRST_HALF;

  /// No description provided for @lvSECOND_HALF.
  ///
  /// In en, this message translates to:
  /// **'Second half (afternoon)'**
  String get lvSECOND_HALF;

  /// No description provided for @lvFormIntro.
  ///
  /// In en, this message translates to:
  /// **'Your head of department approves first, then HR. You are told at each step.'**
  String get lvFormIntro;

  /// No description provided for @lvTypeSection.
  ///
  /// In en, this message translates to:
  /// **'Type of leave'**
  String get lvTypeSection;

  /// No description provided for @lvDatesSection.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get lvDatesSection;

  /// No description provided for @lvPickDates.
  ///
  /// In en, this message translates to:
  /// **'Choose the days'**
  String get lvPickDates;

  /// No description provided for @lvPickDay.
  ///
  /// In en, this message translates to:
  /// **'Choose the day'**
  String get lvPickDay;

  /// No description provided for @lvHalfDaySwitch.
  ///
  /// In en, this message translates to:
  /// **'Only half a day'**
  String get lvHalfDaySwitch;

  /// No description provided for @lvCountNote.
  ///
  /// In en, this message translates to:
  /// **'The weekly holiday and public holidays are not counted.'**
  String get lvCountNote;

  /// No description provided for @lvCountCalendar.
  ///
  /// In en, this message translates to:
  /// **'Counted in calendar days, holidays included.'**
  String get lvCountCalendar;

  /// No description provided for @lvHolidaysIn.
  ///
  /// In en, this message translates to:
  /// **'Public holidays in these dates: {names}'**
  String lvHolidaysIn(Object names);

  /// No description provided for @lvBalanceAfter.
  ///
  /// In en, this message translates to:
  /// **'Balance after this: {left} of {total}'**
  String lvBalanceAfter(Object left, Object total);

  /// No description provided for @lvInsufficient.
  ///
  /// In en, this message translates to:
  /// **'You have {left} of {type} left — this needs {need}.'**
  String lvInsufficient(Object left, Object type, Object need);

  /// No description provided for @lvTooMany.
  ///
  /// In en, this message translates to:
  /// **'{type} is at most {max} in one application.'**
  String lvTooMany(Object type, Object max);

  /// No description provided for @lvNoticeShort.
  ///
  /// In en, this message translates to:
  /// **'{type} needs {days} days\' notice — the earliest start is {date}.'**
  String lvNoticeShort(Object type, Object days, Object date);

  /// No description provided for @lvBackdate.
  ///
  /// In en, this message translates to:
  /// **'{type} can start at most {days} days back.'**
  String lvBackdate(Object type, Object days);

  /// No description provided for @lvNoWorkingDays.
  ///
  /// In en, this message translates to:
  /// **'Those dates are all holidays — there is nothing to take leave for.'**
  String get lvNoWorkingDays;

  /// No description provided for @lvReasonLabel.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get lvReasonLabel;

  /// No description provided for @lvReasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Family wedding in Sylhet'**
  String get lvReasonHint;

  /// No description provided for @lvReliever.
  ///
  /// In en, this message translates to:
  /// **'Covering your work (optional)'**
  String get lvReliever;

  /// No description provided for @lvRelieverEmpty.
  ///
  /// In en, this message translates to:
  /// **'No one chosen'**
  String get lvRelieverEmpty;

  /// No description provided for @lvChooseReliever.
  ///
  /// In en, this message translates to:
  /// **'Who covers your work?'**
  String get lvChooseReliever;

  /// No description provided for @lvRelieverHint.
  ///
  /// In en, this message translates to:
  /// **'Pick a colleague. They are told once the leave is approved.'**
  String get lvRelieverHint;

  /// No description provided for @lvApprover.
  ///
  /// In en, this message translates to:
  /// **'Head of department · approves first'**
  String get lvApprover;

  /// No description provided for @lvChooseApprover.
  ///
  /// In en, this message translates to:
  /// **'Who approves first?'**
  String get lvChooseApprover;

  /// No description provided for @lvApproverHint.
  ///
  /// In en, this message translates to:
  /// **'Usually your line manager. They must be able to sign in to ABG ONE.'**
  String get lvApproverHint;

  /// No description provided for @lvApproverMissing.
  ///
  /// In en, this message translates to:
  /// **'Your line manager {name} has no app account — choose who approves.'**
  String lvApproverMissing(Object name);

  /// No description provided for @lvAddress.
  ///
  /// In en, this message translates to:
  /// **'Address during leave (optional)'**
  String get lvAddress;

  /// No description provided for @lvPhone.
  ///
  /// In en, this message translates to:
  /// **'Contact number during leave (optional)'**
  String get lvPhone;

  /// No description provided for @lvMoreSection.
  ///
  /// In en, this message translates to:
  /// **'While you are away'**
  String get lvMoreSection;

  /// No description provided for @lvSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit application'**
  String get lvSubmit;

  /// No description provided for @lvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'{ref} sent for approval.'**
  String lvSubmitted(Object ref);

  /// No description provided for @lvErrDates.
  ///
  /// In en, this message translates to:
  /// **'Choose the days of leave.'**
  String get lvErrDates;

  /// No description provided for @lvErrReason.
  ///
  /// In en, this message translates to:
  /// **'Say briefly why you need the leave.'**
  String get lvErrReason;

  /// No description provided for @lvErrApprover.
  ///
  /// In en, this message translates to:
  /// **'Choose who approves first.'**
  String get lvErrApprover;

  /// No description provided for @lvPipeline.
  ///
  /// In en, this message translates to:
  /// **'Approval'**
  String get lvPipeline;

  /// No description provided for @lvDetails.
  ///
  /// In en, this message translates to:
  /// **'Leave details'**
  String get lvDetails;

  /// No description provided for @lvTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get lvTypeLabel;

  /// No description provided for @lvFirstDay.
  ///
  /// In en, this message translates to:
  /// **'First day'**
  String get lvFirstDay;

  /// No description provided for @lvLastDay.
  ///
  /// In en, this message translates to:
  /// **'Last day'**
  String get lvLastDay;

  /// No description provided for @lvLength.
  ///
  /// In en, this message translates to:
  /// **'Length'**
  String get lvLength;

  /// No description provided for @lvReasonTitle.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get lvReasonTitle;

  /// No description provided for @lvAddressTitle.
  ///
  /// In en, this message translates to:
  /// **'Address during leave'**
  String get lvAddressTitle;

  /// No description provided for @lvPhoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Contact during leave'**
  String get lvPhoneTitle;

  /// No description provided for @lvPeople.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get lvPeople;

  /// No description provided for @lvApplicant.
  ///
  /// In en, this message translates to:
  /// **'Applicant'**
  String get lvApplicant;

  /// No description provided for @lvHod.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get lvHod;

  /// No description provided for @lvCovering.
  ///
  /// In en, this message translates to:
  /// **'Covering'**
  String get lvCovering;

  /// No description provided for @lvBalanceCard.
  ///
  /// In en, this message translates to:
  /// **'{type} · {year}'**
  String lvBalanceCard(Object type, Object year);

  /// No description provided for @lvEntitled.
  ///
  /// In en, this message translates to:
  /// **'Entitled'**
  String get lvEntitled;

  /// No description provided for @lvUsed.
  ///
  /// In en, this message translates to:
  /// **'Taken'**
  String get lvUsed;

  /// No description provided for @lvPendingLabel.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get lvPendingLabel;

  /// No description provided for @lvAvailable.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get lvAvailable;

  /// No description provided for @lvSeparation.
  ///
  /// In en, this message translates to:
  /// **'You approved this as head of department, so another HR colleague gives the second approval.'**
  String get lvSeparation;

  /// No description provided for @lvRelieverBanner.
  ///
  /// In en, this message translates to:
  /// **'{name} asked you to cover their work during this leave.'**
  String lvRelieverBanner(Object name);

  /// No description provided for @lvActApproveHod.
  ///
  /// In en, this message translates to:
  /// **'Send to HR'**
  String get lvActApproveHod;

  /// No description provided for @lvApproveHodTitle.
  ///
  /// In en, this message translates to:
  /// **'Approve and send to HR'**
  String get lvApproveHodTitle;

  /// No description provided for @lvActApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get lvActApprove;

  /// No description provided for @lvActReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get lvActReject;

  /// No description provided for @lvActCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel leave'**
  String get lvActCancel;

  /// No description provided for @lvApproveHodHint.
  ///
  /// In en, this message translates to:
  /// **'HR gives the final approval.'**
  String get lvApproveHodHint;

  /// No description provided for @lvApproveHrHint.
  ///
  /// In en, this message translates to:
  /// **'This is the final approval; the days come off the balance.'**
  String get lvApproveHrHint;

  /// No description provided for @lvRejectHint.
  ///
  /// In en, this message translates to:
  /// **'Tell the applicant why. They can apply again.'**
  String get lvRejectHint;

  /// No description provided for @lvCancelHint.
  ///
  /// In en, this message translates to:
  /// **'Say why. Your head of department and HR are told, and the days return to your balance.'**
  String get lvCancelHint;

  /// No description provided for @lvCancelHrHint.
  ///
  /// In en, this message translates to:
  /// **'The applicant is told, and the days return to their balance.'**
  String get lvCancelHrHint;

  /// No description provided for @lvDoneApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved — the applicant has been told.'**
  String get lvDoneApproved;

  /// No description provided for @lvDoneForwarded.
  ///
  /// In en, this message translates to:
  /// **'Approved — sent to HR.'**
  String get lvDoneForwarded;

  /// No description provided for @lvDoneRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected — the applicant has been told.'**
  String get lvDoneRejected;

  /// No description provided for @lvDoneCancelled.
  ///
  /// In en, this message translates to:
  /// **'Leave cancelled.'**
  String get lvDoneCancelled;

  /// No description provided for @lvEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Applied'**
  String get lvEvSubmitted;

  /// No description provided for @lvEvHod.
  ///
  /// In en, this message translates to:
  /// **'Approved by head of department'**
  String get lvEvHod;

  /// No description provided for @lvEvApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved by HR'**
  String get lvEvApproved;

  /// No description provided for @lvEvRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get lvEvRejected;

  /// No description provided for @lvEvCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get lvEvCancelled;

  /// No description provided for @lvEvNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get lvEvNote;

  /// No description provided for @licTitle.
  ///
  /// In en, this message translates to:
  /// **'Licences'**
  String get licTitle;

  /// No description provided for @licRegister.
  ///
  /// In en, this message translates to:
  /// **'Licence register'**
  String get licRegister;

  /// No description provided for @licReadOnlyNote.
  ///
  /// In en, this message translates to:
  /// **'Changes are made by the compliance team in the ABG ONE portal.'**
  String get licReadOnlyNote;

  /// No description provided for @licFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get licFilterAll;

  /// No description provided for @licFilterEXPIRING.
  ///
  /// In en, this message translates to:
  /// **'Expiring'**
  String get licFilterEXPIRING;

  /// No description provided for @licFilterDUE_SOON.
  ///
  /// In en, this message translates to:
  /// **'Renewal due'**
  String get licFilterDUE_SOON;

  /// No description provided for @licFilterEXPIRED.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get licFilterEXPIRED;

  /// No description provided for @licFilterRENEWAL_IN_PROGRESS.
  ///
  /// In en, this message translates to:
  /// **'Renewal in progress'**
  String get licFilterRENEWAL_IN_PROGRESS;

  /// No description provided for @licFilterVALID.
  ///
  /// In en, this message translates to:
  /// **'Valid'**
  String get licFilterVALID;

  /// No description provided for @licStateVALID.
  ///
  /// In en, this message translates to:
  /// **'Valid'**
  String get licStateVALID;

  /// No description provided for @licStateDUE_SOON.
  ///
  /// In en, this message translates to:
  /// **'Renewal due'**
  String get licStateDUE_SOON;

  /// No description provided for @licStateEXPIRING.
  ///
  /// In en, this message translates to:
  /// **'Expiring'**
  String get licStateEXPIRING;

  /// No description provided for @licStateEXPIRED.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get licStateEXPIRED;

  /// No description provided for @licRetired.
  ///
  /// In en, this message translates to:
  /// **'Retired'**
  String get licRetired;

  /// No description provided for @licRetiredNotice.
  ///
  /// In en, this message translates to:
  /// **'Retired from the register — no alerts are sent.'**
  String get licRetiredNotice;

  /// No description provided for @licDaysLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 day left} other{{count} days left}}'**
  String licDaysLeft(int count);

  /// No description provided for @licExpiresToday.
  ///
  /// In en, this message translates to:
  /// **'Expires today'**
  String get licExpiresToday;

  /// No description provided for @licExpiredAgo.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Expired 1 day ago} other{Expired {count} days ago}}'**
  String licExpiredAgo(int count);

  /// No description provided for @licCaptionLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{day left} other{days left}}'**
  String licCaptionLeft(int count);

  /// No description provided for @licCaptionOverdue.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{day overdue} other{days overdue}}'**
  String licCaptionOverdue(int count);

  /// No description provided for @licCaptionToday.
  ///
  /// In en, this message translates to:
  /// **'expiry day'**
  String get licCaptionToday;

  /// No description provided for @licToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get licToday;

  /// No description provided for @licWithin30.
  ///
  /// In en, this message translates to:
  /// **'≤ 30 days'**
  String get licWithin30;

  /// No description provided for @licNextToExpire.
  ///
  /// In en, this message translates to:
  /// **'Next to expire'**
  String get licNextToExpire;

  /// No description provided for @licNoLicences.
  ///
  /// In en, this message translates to:
  /// **'No licences here'**
  String get licNoLicences;

  /// No description provided for @licNoLicencesHint.
  ///
  /// In en, this message translates to:
  /// **'Try another filter. Licences for the offices you look after appear here.'**
  String get licNoLicencesHint;

  /// No description provided for @licRenewal.
  ///
  /// In en, this message translates to:
  /// **'Renewal'**
  String get licRenewal;

  /// No description provided for @licRenewalProgress.
  ///
  /// In en, this message translates to:
  /// **'Renewal progress'**
  String get licRenewalProgress;

  /// No description provided for @licStageNOT_STARTED.
  ///
  /// In en, this message translates to:
  /// **'Not started'**
  String get licStageNOT_STARTED;

  /// No description provided for @licStageDOCUMENTS_PREPARED.
  ///
  /// In en, this message translates to:
  /// **'Documents prepared'**
  String get licStageDOCUMENTS_PREPARED;

  /// No description provided for @licStageAPPLICATION_SUBMITTED.
  ///
  /// In en, this message translates to:
  /// **'Application submitted'**
  String get licStageAPPLICATION_SUBMITTED;

  /// No description provided for @licStageINSPECTION_SCHEDULED.
  ///
  /// In en, this message translates to:
  /// **'Inspection scheduled'**
  String get licStageINSPECTION_SCHEDULED;

  /// No description provided for @licStageFEE_PAID.
  ///
  /// In en, this message translates to:
  /// **'Fee paid'**
  String get licStageFEE_PAID;

  /// No description provided for @licStageRENEWED.
  ///
  /// In en, this message translates to:
  /// **'Renewed'**
  String get licStageRENEWED;

  /// No description provided for @licStartedOn.
  ///
  /// In en, this message translates to:
  /// **'Started {date}'**
  String licStartedOn(Object date);

  /// No description provided for @licNotStartedHint.
  ///
  /// In en, this message translates to:
  /// **'Renewal has not started yet. The renewal window opens on {date}.'**
  String licNotStartedHint(Object date);

  /// No description provided for @licWindowOpenHint.
  ///
  /// In en, this message translates to:
  /// **'Renewal has not started yet. The renewal window opened on {date}.'**
  String licWindowOpenHint(Object date);

  /// No description provided for @licNextStep.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get licNextStep;

  /// No description provided for @licCatTRADE.
  ///
  /// In en, this message translates to:
  /// **'Trade licence'**
  String get licCatTRADE;

  /// No description provided for @licCatFACTORY.
  ///
  /// In en, this message translates to:
  /// **'Factory licence'**
  String get licCatFACTORY;

  /// No description provided for @licCatENVIRONMENT.
  ///
  /// In en, this message translates to:
  /// **'Environmental clearance'**
  String get licCatENVIRONMENT;

  /// No description provided for @licCatFIRE_SAFETY.
  ///
  /// In en, this message translates to:
  /// **'Fire safety'**
  String get licCatFIRE_SAFETY;

  /// No description provided for @licCatENERGY_REGULATORY.
  ///
  /// In en, this message translates to:
  /// **'Energy regulatory (BERC)'**
  String get licCatENERGY_REGULATORY;

  /// No description provided for @licCatEXPLOSIVES.
  ///
  /// In en, this message translates to:
  /// **'Explosives / LPG storage'**
  String get licCatEXPLOSIVES;

  /// No description provided for @licCatBOILER.
  ///
  /// In en, this message translates to:
  /// **'Boiler certificate'**
  String get licCatBOILER;

  /// No description provided for @licCatIMPORT_EXPORT.
  ///
  /// In en, this message translates to:
  /// **'Import / export (IRC / ERC)'**
  String get licCatIMPORT_EXPORT;

  /// No description provided for @licCatSTANDARDS.
  ///
  /// In en, this message translates to:
  /// **'Standards (BSTI)'**
  String get licCatSTANDARDS;

  /// No description provided for @licCatOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get licCatOTHER;

  /// No description provided for @licDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get licDetails;

  /// No description provided for @licNumber.
  ///
  /// In en, this message translates to:
  /// **'Licence number'**
  String get licNumber;

  /// No description provided for @licKind.
  ///
  /// In en, this message translates to:
  /// **'Kind of licence'**
  String get licKind;

  /// No description provided for @licAuthority.
  ///
  /// In en, this message translates to:
  /// **'Issuing authority'**
  String get licAuthority;

  /// No description provided for @licOffice.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get licOffice;

  /// No description provided for @licOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get licOwner;

  /// No description provided for @licNoOwner.
  ///
  /// In en, this message translates to:
  /// **'Not set — alerts go to the compliance team'**
  String get licNoOwner;

  /// No description provided for @licIssuedOn.
  ///
  /// In en, this message translates to:
  /// **'Issued on'**
  String get licIssuedOn;

  /// No description provided for @licExpiresOn.
  ///
  /// In en, this message translates to:
  /// **'Expires on'**
  String get licExpiresOn;

  /// No description provided for @licExpiredOn.
  ///
  /// In en, this message translates to:
  /// **'Expired on'**
  String get licExpiredOn;

  /// No description provided for @licWindow.
  ///
  /// In en, this message translates to:
  /// **'Renewal window'**
  String get licWindow;

  /// No description provided for @licWindowValue.
  ///
  /// In en, this message translates to:
  /// **'{days} days before expiry'**
  String licWindowValue(int days);

  /// No description provided for @licFee.
  ///
  /// In en, this message translates to:
  /// **'Renewal fee'**
  String get licFee;

  /// No description provided for @licFeeValue.
  ///
  /// In en, this message translates to:
  /// **'Tk {amount}'**
  String licFeeValue(Object amount);

  /// No description provided for @licNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get licNotes;

  /// No description provided for @licNextAlert.
  ///
  /// In en, this message translates to:
  /// **'Next alert on {date}'**
  String licNextAlert(Object date);

  /// No description provided for @licAllAlertsSent.
  ///
  /// In en, this message translates to:
  /// **'All expiry alerts for this date have gone out.'**
  String get licAllAlertsSent;

  /// No description provided for @licScan.
  ///
  /// In en, this message translates to:
  /// **'Scanned copy'**
  String get licScan;

  /// No description provided for @licViewScan.
  ///
  /// In en, this message translates to:
  /// **'View scanned copy'**
  String get licViewScan;

  /// No description provided for @licNoScan.
  ///
  /// In en, this message translates to:
  /// **'No scanned copy yet.'**
  String get licNoScan;

  /// No description provided for @licPdf.
  ///
  /// In en, this message translates to:
  /// **'PDF document'**
  String get licPdf;

  /// No description provided for @licImage.
  ///
  /// In en, this message translates to:
  /// **'Image'**
  String get licImage;

  /// No description provided for @licOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open the document. Check your connection and try again.'**
  String get licOpenFailed;

  /// No description provided for @licHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get licHistory;

  /// No description provided for @licEvCreated.
  ///
  /// In en, this message translates to:
  /// **'Added to the register'**
  String get licEvCreated;

  /// No description provided for @licEvDetails.
  ///
  /// In en, this message translates to:
  /// **'Details changed'**
  String get licEvDetails;

  /// No description provided for @licEvRetired.
  ///
  /// In en, this message translates to:
  /// **'Retired from the register'**
  String get licEvRetired;

  /// No description provided for @licEvRestored.
  ///
  /// In en, this message translates to:
  /// **'Back in use'**
  String get licEvRestored;

  /// No description provided for @licEvStage.
  ///
  /// In en, this message translates to:
  /// **'Renewal moved to {stage}'**
  String licEvStage(Object stage);

  /// No description provided for @licEvStageBack.
  ///
  /// In en, this message translates to:
  /// **'Renewal moved back to {stage}'**
  String licEvStageBack(Object stage);

  /// No description provided for @licEvRenewed.
  ///
  /// In en, this message translates to:
  /// **'Renewed until {date}'**
  String licEvRenewed(Object date);

  /// No description provided for @licEvDocument.
  ///
  /// In en, this message translates to:
  /// **'Scanned copy uploaded'**
  String get licEvDocument;

  /// No description provided for @licEvAlert.
  ///
  /// In en, this message translates to:
  /// **'Expiry alert: {days} days before'**
  String licEvAlert(int days);

  /// No description provided for @licEvAlertDay.
  ///
  /// In en, this message translates to:
  /// **'Expiry alert: expiry day'**
  String get licEvAlertDay;

  /// No description provided for @licEvNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get licEvNote;

  /// No description provided for @licEvNotified.
  ///
  /// In en, this message translates to:
  /// **'Sent to {names}'**
  String licEvNotified(Object names);

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

  /// No description provided for @tourTitle.
  ///
  /// In en, this message translates to:
  /// **'Official tours'**
  String get tourTitle;

  /// No description provided for @tourApply.
  ///
  /// In en, this message translates to:
  /// **'Apply for a tour'**
  String get tourApply;

  /// No description provided for @tourMyRequests.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get tourMyRequests;

  /// No description provided for @tourToApprove.
  ///
  /// In en, this message translates to:
  /// **'To approve'**
  String get tourToApprove;

  /// No description provided for @tourFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get tourFilterAll;

  /// No description provided for @tourFilterOpen.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get tourFilterOpen;

  /// No description provided for @tourFilterClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get tourFilterClosed;

  /// No description provided for @tourNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No tour requests yet'**
  String get tourNoRequests;

  /// No description provided for @tourNoRequestsHint.
  ///
  /// In en, this message translates to:
  /// **'Apply for a local or overseas tour and follow every approval here.'**
  String get tourNoRequestsHint;

  /// No description provided for @tourNothingToApprove.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for you'**
  String get tourNothingToApprove;

  /// No description provided for @tourNothingToApproveHint.
  ///
  /// In en, this message translates to:
  /// **'Requests you need to approve, vet or sanction appear here.'**
  String get tourNothingToApproveHint;

  /// No description provided for @tourWaitingCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 request waiting for you} other{{count} requests waiting for you}}'**
  String tourWaitingCount(int count);

  /// No description provided for @tourYourDecision.
  ///
  /// In en, this message translates to:
  /// **'Your decision'**
  String get tourYourDecision;

  /// No description provided for @tourReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get tourReview;

  /// No description provided for @tourSanctioned.
  ///
  /// In en, this message translates to:
  /// **'Sanctioned {amount}'**
  String tourSanctioned(Object amount);

  /// No description provided for @tourStatusPENDING_HOD.
  ///
  /// In en, this message translates to:
  /// **'Pending HOD approval'**
  String get tourStatusPENDING_HOD;

  /// No description provided for @tourStatusPENDING_VETTING.
  ///
  /// In en, this message translates to:
  /// **'HR & Finance vetting'**
  String get tourStatusPENDING_VETTING;

  /// No description provided for @tourStatusPENDING_SANCTION.
  ///
  /// In en, this message translates to:
  /// **'MD / Chairman sanction'**
  String get tourStatusPENDING_SANCTION;

  /// No description provided for @tourStatusAPPROVED.
  ///
  /// In en, this message translates to:
  /// **'Approved & funds sanctioned'**
  String get tourStatusAPPROVED;

  /// No description provided for @tourStatusACTIVE.
  ///
  /// In en, this message translates to:
  /// **'Tour active'**
  String get tourStatusACTIVE;

  /// No description provided for @tourStatusCOMPLETED.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get tourStatusCOMPLETED;

  /// No description provided for @tourStatusREJECTED.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get tourStatusREJECTED;

  /// No description provided for @tourStatusCANCELLED.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get tourStatusCANCELLED;

  /// No description provided for @tourTypeLOCAL.
  ///
  /// In en, this message translates to:
  /// **'Local'**
  String get tourTypeLOCAL;

  /// No description provided for @tourTypeFOREIGN.
  ///
  /// In en, this message translates to:
  /// **'Foreign'**
  String get tourTypeFOREIGN;

  /// No description provided for @tourPurposeCONFERENCE.
  ///
  /// In en, this message translates to:
  /// **'Conference'**
  String get tourPurposeCONFERENCE;

  /// No description provided for @tourPurposeTECHNICAL_INSPECTION.
  ///
  /// In en, this message translates to:
  /// **'Technical inspection'**
  String get tourPurposeTECHNICAL_INSPECTION;

  /// No description provided for @tourPurposeVENDOR_AUDIT.
  ///
  /// In en, this message translates to:
  /// **'Vendor audit'**
  String get tourPurposeVENDOR_AUDIT;

  /// No description provided for @tourPurposeTRAINING.
  ///
  /// In en, this message translates to:
  /// **'Training'**
  String get tourPurposeTRAINING;

  /// No description provided for @tourPurposeCLIENT_MEETING.
  ///
  /// In en, this message translates to:
  /// **'Client meeting'**
  String get tourPurposeCLIENT_MEETING;

  /// No description provided for @tourPurposePLANT_VISIT.
  ///
  /// In en, this message translates to:
  /// **'Plant / site visit'**
  String get tourPurposePLANT_VISIT;

  /// No description provided for @tourPurposeOTHER.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get tourPurposeOTHER;

  /// No description provided for @tourTransportAIR.
  ///
  /// In en, this message translates to:
  /// **'Air'**
  String get tourTransportAIR;

  /// No description provided for @tourTransportROAD.
  ///
  /// In en, this message translates to:
  /// **'Road'**
  String get tourTransportROAD;

  /// No description provided for @tourTransportRAIL.
  ///
  /// In en, this message translates to:
  /// **'Rail'**
  String get tourTransportRAIL;

  /// No description provided for @tourTransportWATER.
  ///
  /// In en, this message translates to:
  /// **'Water'**
  String get tourTransportWATER;

  /// No description provided for @tourTransportPOOL_CAR.
  ///
  /// In en, this message translates to:
  /// **'Pool car'**
  String get tourTransportPOOL_CAR;

  /// No description provided for @tourAwaitingHOD.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get tourAwaitingHOD;

  /// No description provided for @tourAwaitingVETTING.
  ///
  /// In en, this message translates to:
  /// **'HR & Finance'**
  String get tourAwaitingVETTING;

  /// No description provided for @tourAwaitingSANCTION.
  ///
  /// In en, this message translates to:
  /// **'MD / Chairman'**
  String get tourAwaitingSANCTION;

  /// No description provided for @tourDays.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 day} other{{count} days}}'**
  String tourDays(int count);

  /// No description provided for @tourPipeline.
  ///
  /// In en, this message translates to:
  /// **'Approval pipeline'**
  String get tourPipeline;

  /// No description provided for @tourStageSUBMITTED.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get tourStageSUBMITTED;

  /// No description provided for @tourStagePENDING_HOD.
  ///
  /// In en, this message translates to:
  /// **'HOD approval'**
  String get tourStagePENDING_HOD;

  /// No description provided for @tourStagePENDING_VETTING.
  ///
  /// In en, this message translates to:
  /// **'HR & Finance vetting'**
  String get tourStagePENDING_VETTING;

  /// No description provided for @tourStagePENDING_SANCTION.
  ///
  /// In en, this message translates to:
  /// **'MD / Chairman sanction'**
  String get tourStagePENDING_SANCTION;

  /// No description provided for @tourStageAPPROVED.
  ///
  /// In en, this message translates to:
  /// **'Funds sanctioned'**
  String get tourStageAPPROVED;

  /// No description provided for @tourStageACTIVE.
  ///
  /// In en, this message translates to:
  /// **'On tour'**
  String get tourStageACTIVE;

  /// No description provided for @tourStageCOMPLETED.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get tourStageCOMPLETED;

  /// No description provided for @tourWaitingFor.
  ///
  /// In en, this message translates to:
  /// **'Waiting for {name}'**
  String tourWaitingFor(Object name);

  /// No description provided for @tourStageRejectedBy.
  ///
  /// In en, this message translates to:
  /// **'Rejected by {name}'**
  String tourStageRejectedBy(Object name);

  /// No description provided for @tourStageCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled by the traveller'**
  String get tourStageCancelled;

  /// No description provided for @tourStageSkipped.
  ///
  /// In en, this message translates to:
  /// **'Not reached'**
  String get tourStageSkipped;

  /// No description provided for @tourStageInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get tourStageInProgress;

  /// No description provided for @tourFormIntro.
  ///
  /// In en, this message translates to:
  /// **'Your head of department approves first, then HR & Finance vet the budget. Overseas tours also need the MD\'s or Chairman\'s sanction.'**
  String get tourFormIntro;

  /// No description provided for @tourWhere.
  ///
  /// In en, this message translates to:
  /// **'Where are you going?'**
  String get tourWhere;

  /// No description provided for @tourLocalHint.
  ///
  /// In en, this message translates to:
  /// **'Within Bangladesh'**
  String get tourLocalHint;

  /// No description provided for @tourForeignHint.
  ///
  /// In en, this message translates to:
  /// **'Overseas · needs sanction'**
  String get tourForeignHint;

  /// No description provided for @tourPurposeLabel.
  ///
  /// In en, this message translates to:
  /// **'Purpose'**
  String get tourPurposeLabel;

  /// No description provided for @tourTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get tourTitleLabel;

  /// No description provided for @tourTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Compressor vendor audit'**
  String get tourTitleHint;

  /// No description provided for @tourDestinationLabel.
  ///
  /// In en, this message translates to:
  /// **'Destination'**
  String get tourDestinationLabel;

  /// No description provided for @tourDestinationHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Chattogram LPG refinery'**
  String get tourDestinationHint;

  /// No description provided for @tourCityLabel.
  ///
  /// In en, this message translates to:
  /// **'City / site'**
  String get tourCityLabel;

  /// No description provided for @tourCountryLabel.
  ///
  /// In en, this message translates to:
  /// **'Country'**
  String get tourCountryLabel;

  /// No description provided for @tourDatesLabel.
  ///
  /// In en, this message translates to:
  /// **'Travel dates'**
  String get tourDatesLabel;

  /// No description provided for @tourPickDates.
  ///
  /// In en, this message translates to:
  /// **'Choose your travel dates'**
  String get tourPickDates;

  /// No description provided for @tourTransportLabel.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get tourTransportLabel;

  /// No description provided for @tourCoTravellers.
  ///
  /// In en, this message translates to:
  /// **'Co-travellers'**
  String get tourCoTravellers;

  /// No description provided for @tourCoTravellerHint.
  ///
  /// In en, this message translates to:
  /// **'Name of a colleague on the same trip'**
  String get tourCoTravellerHint;

  /// No description provided for @tourCoTravellerAdd.
  ///
  /// In en, this message translates to:
  /// **'Add co-traveller'**
  String get tourCoTravellerAdd;

  /// No description provided for @tourRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}'**
  String tourRemove(Object name);

  /// No description provided for @tourBudgetSection.
  ///
  /// In en, this message translates to:
  /// **'Budget'**
  String get tourBudgetSection;

  /// No description provided for @tourEstimatedBudget.
  ///
  /// In en, this message translates to:
  /// **'Estimated budget (৳)'**
  String get tourEstimatedBudget;

  /// No description provided for @tourBudgetHint.
  ///
  /// In en, this message translates to:
  /// **'Fares, hotel, per diem and local transport'**
  String get tourBudgetHint;

  /// No description provided for @tourAdvance.
  ///
  /// In en, this message translates to:
  /// **'Advance requested (৳)'**
  String get tourAdvance;

  /// No description provided for @tourPassportSection.
  ///
  /// In en, this message translates to:
  /// **'Passport'**
  String get tourPassportSection;

  /// No description provided for @tourPassportNumber.
  ///
  /// In en, this message translates to:
  /// **'Passport number'**
  String get tourPassportNumber;

  /// No description provided for @tourPassportExpiry.
  ///
  /// In en, this message translates to:
  /// **'Passport expiry date'**
  String get tourPassportExpiry;

  /// No description provided for @tourPassportWarning.
  ///
  /// In en, this message translates to:
  /// **'Your passport expires within 6 months of your return. Most countries need 6 months\' validity — start the renewal now.'**
  String get tourPassportWarning;

  /// No description provided for @tourPassportExpired.
  ///
  /// In en, this message translates to:
  /// **'Your passport expires before you return. Renew it before applying.'**
  String get tourPassportExpired;

  /// No description provided for @tourApprover.
  ///
  /// In en, this message translates to:
  /// **'Approver'**
  String get tourApprover;

  /// No description provided for @tourApproverHint.
  ///
  /// In en, this message translates to:
  /// **'Your head of department approves first.'**
  String get tourApproverHint;

  /// No description provided for @tourChange.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get tourChange;

  /// No description provided for @tourChooseApprover.
  ///
  /// In en, this message translates to:
  /// **'Choose approver'**
  String get tourChooseApprover;

  /// No description provided for @tourNoManager.
  ///
  /// In en, this message translates to:
  /// **'No line manager on record — choose who approves.'**
  String get tourNoManager;

  /// No description provided for @tourManagerNoAccount.
  ///
  /// In en, this message translates to:
  /// **'{name} has no ABG ONE account — choose someone else.'**
  String tourManagerNoAccount(Object name);

  /// No description provided for @tourSearchPeople.
  ///
  /// In en, this message translates to:
  /// **'Search by name, ID or designation'**
  String get tourSearchPeople;

  /// No description provided for @tourNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No account'**
  String get tourNoAccount;

  /// No description provided for @tourDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Details (optional)'**
  String get tourDescriptionLabel;

  /// No description provided for @tourDescriptionHint.
  ///
  /// In en, this message translates to:
  /// **'Agenda, people you will meet, what the company gains'**
  String get tourDescriptionHint;

  /// No description provided for @tourSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit request'**
  String get tourSubmit;

  /// No description provided for @tourSubmitted.
  ///
  /// In en, this message translates to:
  /// **'{reference} sent for approval'**
  String tourSubmitted(Object reference);

  /// No description provided for @tourErrTitle.
  ///
  /// In en, this message translates to:
  /// **'Give the tour a short title.'**
  String get tourErrTitle;

  /// No description provided for @tourErrDestination.
  ///
  /// In en, this message translates to:
  /// **'Say where you are going.'**
  String get tourErrDestination;

  /// No description provided for @tourErrCountry.
  ///
  /// In en, this message translates to:
  /// **'Give the destination country.'**
  String get tourErrCountry;

  /// No description provided for @tourErrDates.
  ///
  /// In en, this message translates to:
  /// **'Choose your travel dates.'**
  String get tourErrDates;

  /// No description provided for @tourErrBudget.
  ///
  /// In en, this message translates to:
  /// **'Enter the estimated budget in Taka.'**
  String get tourErrBudget;

  /// No description provided for @tourErrAdvance.
  ///
  /// In en, this message translates to:
  /// **'The advance cannot be more than the budget.'**
  String get tourErrAdvance;

  /// No description provided for @tourErrPassport.
  ///
  /// In en, this message translates to:
  /// **'Enter your passport number and expiry date.'**
  String get tourErrPassport;

  /// No description provided for @tourErrApprover.
  ///
  /// In en, this message translates to:
  /// **'Choose who approves this tour.'**
  String get tourErrApprover;

  /// No description provided for @tourOfflineNotice.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline. Tour requests need a connection — try again when you\'re back online.'**
  String get tourOfflineNotice;

  /// No description provided for @tourTrip.
  ///
  /// In en, this message translates to:
  /// **'Trip'**
  String get tourTrip;

  /// No description provided for @tourDeparture.
  ///
  /// In en, this message translates to:
  /// **'Departure'**
  String get tourDeparture;

  /// No description provided for @tourReturn.
  ///
  /// In en, this message translates to:
  /// **'Return'**
  String get tourReturn;

  /// No description provided for @tourDuration.
  ///
  /// In en, this message translates to:
  /// **'Duration'**
  String get tourDuration;

  /// No description provided for @tourOffice.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get tourOffice;

  /// No description provided for @tourBudgetEstimated.
  ///
  /// In en, this message translates to:
  /// **'Estimated'**
  String get tourBudgetEstimated;

  /// No description provided for @tourBudgetAdvance.
  ///
  /// In en, this message translates to:
  /// **'Advance'**
  String get tourBudgetAdvance;

  /// No description provided for @tourBudgetSanctioned.
  ///
  /// In en, this message translates to:
  /// **'Sanctioned'**
  String get tourBudgetSanctioned;

  /// No description provided for @tourNotYet.
  ///
  /// In en, this message translates to:
  /// **'Not yet'**
  String get tourNotYet;

  /// No description provided for @tourNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get tourNone;

  /// No description provided for @tourTraveller.
  ///
  /// In en, this message translates to:
  /// **'Traveller'**
  String get tourTraveller;

  /// No description provided for @tourHod.
  ///
  /// In en, this message translates to:
  /// **'Head of department'**
  String get tourHod;

  /// No description provided for @tourAlone.
  ///
  /// In en, this message translates to:
  /// **'Travelling alone'**
  String get tourAlone;

  /// No description provided for @tourValidUntil.
  ///
  /// In en, this message translates to:
  /// **'Valid until'**
  String get tourValidUntil;

  /// No description provided for @tourHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get tourHistory;

  /// No description provided for @tourPassportAlertTitle.
  ///
  /// In en, this message translates to:
  /// **'Passport needs renewal'**
  String get tourPassportAlertTitle;

  /// No description provided for @tourPassportAlertBody.
  ///
  /// In en, this message translates to:
  /// **'Valid until {expiry}; the tour ends {end}. Most countries need six months\' validity — renew before booking.'**
  String tourPassportAlertBody(Object expiry, Object end);

  /// No description provided for @tourStartableFrom.
  ///
  /// In en, this message translates to:
  /// **'Approved and funds sanctioned. You can start the tour from {date}.'**
  String tourStartableFrom(Object date);

  /// No description provided for @tourSeparation.
  ///
  /// In en, this message translates to:
  /// **'You approved this as head of department, so another HR & Finance member must vet it.'**
  String get tourSeparation;

  /// No description provided for @tourLatestNote.
  ///
  /// In en, this message translates to:
  /// **'Latest note'**
  String get tourLatestNote;

  /// No description provided for @tourActApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get tourActApprove;

  /// No description provided for @tourActVet.
  ///
  /// In en, this message translates to:
  /// **'Vet & forward'**
  String get tourActVet;

  /// No description provided for @tourActApproveSanction.
  ///
  /// In en, this message translates to:
  /// **'Approve & sanction'**
  String get tourActApproveSanction;

  /// No description provided for @tourActSanction.
  ///
  /// In en, this message translates to:
  /// **'Sanction tour'**
  String get tourActSanction;

  /// No description provided for @tourActReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get tourActReject;

  /// No description provided for @tourActStart.
  ///
  /// In en, this message translates to:
  /// **'Start tour'**
  String get tourActStart;

  /// No description provided for @tourActComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark completed'**
  String get tourActComplete;

  /// No description provided for @tourActCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel request'**
  String get tourActCancel;

  /// No description provided for @tourActNote.
  ///
  /// In en, this message translates to:
  /// **'Add note'**
  String get tourActNote;

  /// No description provided for @tourApproveHod.
  ///
  /// In en, this message translates to:
  /// **'Approve as head of department'**
  String get tourApproveHod;

  /// No description provided for @tourApproveHodHint.
  ///
  /// In en, this message translates to:
  /// **'It goes to HR & Finance for budget vetting next.'**
  String get tourApproveHodHint;

  /// No description provided for @tourVetHint.
  ///
  /// In en, this message translates to:
  /// **'Confirm the amount to sanction. The MD / Chairman are asked next.'**
  String get tourVetHint;

  /// No description provided for @tourVetLocalHint.
  ///
  /// In en, this message translates to:
  /// **'HR & Finance approval completes a local tour and sanctions the funds.'**
  String get tourVetLocalHint;

  /// No description provided for @tourSanctionHint.
  ///
  /// In en, this message translates to:
  /// **'Your sanction approves the tour and releases the funds.'**
  String get tourSanctionHint;

  /// No description provided for @tourRejectHint.
  ///
  /// In en, this message translates to:
  /// **'A reason is required — the traveller sees it.'**
  String get tourRejectHint;

  /// No description provided for @tourCancelHint.
  ///
  /// In en, this message translates to:
  /// **'A reason is required. Whoever is handling it is told.'**
  String get tourCancelHint;

  /// No description provided for @tourStartHint.
  ///
  /// In en, this message translates to:
  /// **'Your head of department is told you are on your way.'**
  String get tourStartHint;

  /// No description provided for @tourCompleteHint.
  ///
  /// In en, this message translates to:
  /// **'Closes the tour. Any advance goes to HR & Finance for settlement.'**
  String get tourCompleteHint;

  /// No description provided for @tourNoteHint.
  ///
  /// In en, this message translates to:
  /// **'Kept in the history; the other side is told.'**
  String get tourNoteHint;

  /// No description provided for @tourReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get tourReason;

  /// No description provided for @tourNoteOptional.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get tourNoteOptional;

  /// No description provided for @tourNoteLabel.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get tourNoteLabel;

  /// No description provided for @tourSanctionedBudget.
  ///
  /// In en, this message translates to:
  /// **'Sanctioned budget (৳)'**
  String get tourSanctionedBudget;

  /// No description provided for @tourReasonRequired.
  ///
  /// In en, this message translates to:
  /// **'Write a short reason.'**
  String get tourReasonRequired;

  /// No description provided for @tourDoneApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved — the next approver has been told.'**
  String get tourDoneApproved;

  /// No description provided for @tourDoneSanctioned.
  ///
  /// In en, this message translates to:
  /// **'Approved — funds sanctioned and the traveller told.'**
  String get tourDoneSanctioned;

  /// No description provided for @tourDoneRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected — the traveller has been told why.'**
  String get tourDoneRejected;

  /// No description provided for @tourDoneStarted.
  ///
  /// In en, this message translates to:
  /// **'Tour started. Safe travels!'**
  String get tourDoneStarted;

  /// No description provided for @tourDoneCompleted.
  ///
  /// In en, this message translates to:
  /// **'Tour marked completed.'**
  String get tourDoneCompleted;

  /// No description provided for @tourDoneCancelled.
  ///
  /// In en, this message translates to:
  /// **'Request cancelled.'**
  String get tourDoneCancelled;

  /// No description provided for @tourDoneNote.
  ///
  /// In en, this message translates to:
  /// **'Note added.'**
  String get tourDoneNote;

  /// No description provided for @tourEvSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Applied'**
  String get tourEvSubmitted;

  /// No description provided for @tourEvHod.
  ///
  /// In en, this message translates to:
  /// **'Approved by head of department'**
  String get tourEvHod;

  /// No description provided for @tourEvVetted.
  ///
  /// In en, this message translates to:
  /// **'Vetted by HR & Finance'**
  String get tourEvVetted;

  /// No description provided for @tourEvApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved & funds sanctioned'**
  String get tourEvApproved;

  /// No description provided for @tourEvSanctioned.
  ///
  /// In en, this message translates to:
  /// **'Sanctioned by MD / Chairman'**
  String get tourEvSanctioned;

  /// No description provided for @tourEvRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get tourEvRejected;

  /// No description provided for @tourEvStarted.
  ///
  /// In en, this message translates to:
  /// **'Tour started'**
  String get tourEvStarted;

  /// No description provided for @tourEvCompleted.
  ///
  /// In en, this message translates to:
  /// **'Tour completed'**
  String get tourEvCompleted;

  /// No description provided for @tourEvCancelled.
  ///
  /// In en, this message translates to:
  /// **'Request cancelled'**
  String get tourEvCancelled;

  /// No description provided for @tourEvNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get tourEvNote;

  /// No description provided for @tourEvBudget.
  ///
  /// In en, this message translates to:
  /// **'Sanctioned budget set to {amount}'**
  String tourEvBudget(Object amount);

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
