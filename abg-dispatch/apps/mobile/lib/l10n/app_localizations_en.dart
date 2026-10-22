// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class LEn extends L {
  LEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'ABG ONE';

  @override
  String get orgName => 'Anvir Bashundhara Group';

  @override
  String get tagline => 'One app for the whole group.';

  @override
  String get splashLoading => 'Securing your session';

  @override
  String get signIn => 'Sign in';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get signInSubtitle => 'Sign in with your ABG email or employee ID.';

  @override
  String get identifierLabel => 'Email or employee ID';

  @override
  String get passwordLabel => 'Password';

  @override
  String get authenticatorLabel => 'Authenticator code';

  @override
  String get carrierEntry => 'Carrying a parcel without an ABG account?';

  @override
  String get carrierEntryAction => 'Carrier sign-in';

  @override
  String get securedFooter => 'Secured access · Every action is logged';

  @override
  String get guestTitle => 'Carrier sign-in';

  @override
  String get guestSubtitle =>
      'Enter the mobile number dispatch registered for you. We will text you a 6-digit code.';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get sendCode => 'Send code';

  @override
  String get codeLabel => '6-digit code';

  @override
  String get verifyContinue => 'Verify and continue';

  @override
  String codeSentTo(Object phone) {
    return 'Code sent to $phone';
  }

  @override
  String devCode(Object code) {
    return 'Development code: $code';
  }

  @override
  String greetingMorning(Object name) {
    return 'Good morning, $name';
  }

  @override
  String greetingAfternoon(Object name) {
    return 'Good afternoon, $name';
  }

  @override
  String greetingEvening(Object name) {
    return 'Good evening, $name';
  }

  @override
  String get sendParcel => 'Send a parcel';

  @override
  String get sendParcelHint =>
      'Book a document, instrument or package in under a minute';

  @override
  String get myActivity => 'My activity';

  @override
  String get inTransit => 'In transit';

  @override
  String get waitingForMe => 'Waiting for me';

  @override
  String get pendingPickup => 'Pending pickup';

  @override
  String get assignedToMe => 'Assigned to me';

  @override
  String get actionRequired => 'Action required';

  @override
  String get recentParcels => 'Recent parcels';

  @override
  String get seeAll => 'See all';

  @override
  String get navHome => 'Home';

  @override
  String get navParcels => 'Parcels';

  @override
  String get navScan => 'Scan';

  @override
  String get navAlerts => 'Alerts';

  @override
  String get navProfile => 'Profile';

  @override
  String get tabIncoming => 'Incoming';

  @override
  String get tabOutgoing => 'Outgoing';

  @override
  String get tabAssigned => 'Carrying';

  @override
  String get tabCompleted => 'Completed';

  @override
  String get searchParcels => 'Search tracking ID, title or person';

  @override
  String get noParcels => 'No parcels here yet';

  @override
  String get noParcelsHint =>
      'Parcels you send, receive or carry will appear here.';

  @override
  String get noMatches => 'No parcels match this search';

  @override
  String get allCaughtUp => 'You\'re all caught up';

  @override
  String get nothingWaiting => 'No parcels are waiting for you.';

  @override
  String get from => 'From';

  @override
  String get to => 'To';

  @override
  String get carrier => 'Carrier';

  @override
  String get timeline => 'Custody timeline';

  @override
  String get details => 'Details';

  @override
  String get priority => 'Priority';

  @override
  String get classification => 'Classification';

  @override
  String get category => 'Category';

  @override
  String get receipt => 'Receipt';

  @override
  String get receivedBy => 'Received by';

  @override
  String onBehalfOf(Object name) {
    return 'On behalf of $name';
  }

  @override
  String get verifiedBy => 'Verified by';

  @override
  String get attachments => 'Evidence & attachments';

  @override
  String get notes => 'Notes';

  @override
  String get showQr => 'QR label';

  @override
  String get call => 'Call';

  @override
  String get upcoming => 'Upcoming';

  @override
  String expectedBy(Object time) {
    return 'Expected by $time';
  }

  @override
  String get overdue => 'Overdue';

  @override
  String get exceptionOpen => 'Exception open';

  @override
  String sentOnBehalf(Object name) {
    return 'Booked by $name on the sender\'s behalf';
  }

  @override
  String get contentHidden => 'Contents are restricted for your role.';

  @override
  String get actionAccept => 'Accept assignment';

  @override
  String get actionRequestHandover => 'Request handover';

  @override
  String get actionConfirmHandover => 'Confirm handover';

  @override
  String get actionEnterPin => 'Enter sender\'s PIN';

  @override
  String get actionOfficerHandover => 'Confirm as dispatch officer';

  @override
  String get actionStartTransit => 'Start transit';

  @override
  String get actionCheckpoint => 'Add checkpoint';

  @override
  String get actionArrived => 'Mark arrived';

  @override
  String get actionReceive => 'Receive parcel';

  @override
  String get actionReceiveOnBehalf => 'Receive on behalf';

  @override
  String get actionReceiveWithCode => 'Receiver has a code';

  @override
  String get actionSendCode => 'Send receipt code';

  @override
  String get actionException => 'Report a problem';

  @override
  String get actionCancel => 'Cancel dispatch';

  @override
  String get actionReturn => 'Request return';

  @override
  String get actionStartReturn => 'Start return';

  @override
  String get actionConfirmReturn => 'Confirm it\'s back';

  @override
  String get actionBook => 'Book now';

  @override
  String get actionComment => 'Add note';

  @override
  String confirmHandoverBody(Object name) {
    return 'Confirm you have handed this parcel to $name. The time and your name are recorded.';
  }

  @override
  String get pinTitle => 'Sender\'s handover PIN';

  @override
  String get pinHint =>
      'Ask the sender for the 6-digit PIN they received when booking.';

  @override
  String get receiveTitle => 'Confirm receipt';

  @override
  String get receiveBody =>
      'Confirm this parcel is in your hands. Your name, employee ID and the time are recorded as proof.';

  @override
  String get scanToReceive => 'Scan the label to receive';

  @override
  String get onBehalfTitle => 'Receive on behalf';

  @override
  String onBehalfBody(Object name) {
    return 'You are receiving this for $name. They will be notified that you have it.';
  }

  @override
  String get reasonLabel => 'Reason';

  @override
  String get reasonHint => 'e.g. Receiver is in a meeting';

  @override
  String get relationshipLabel => 'Your relationship';

  @override
  String get relationshipHint => 'e.g. Assistant, same department';

  @override
  String get receiptCodeTitle => 'Receiver\'s code';

  @override
  String get receiptCodeBody =>
      'Enter the 6-digit code the receiver got by SMS.';

  @override
  String get signature => 'Receiver\'s signature';

  @override
  String get signatureRequired =>
      'A signature is required for highly confidential parcels.';

  @override
  String get clear => 'Clear';

  @override
  String get exceptionType => 'What happened?';

  @override
  String get exceptionDetails => 'Details';

  @override
  String get returnTitle => 'Request a return';

  @override
  String get cancelTitle => 'Cancel this dispatch?';

  @override
  String get checkpointLabel => 'Where are you?';

  @override
  String get checkpointHint => 'e.g. Factory A main gate';

  @override
  String get submit => 'Submit';

  @override
  String get confirm => 'Confirm';

  @override
  String get cancel => 'Cancel';

  @override
  String get close => 'Close';

  @override
  String get done => 'Done';

  @override
  String get next => 'Next';

  @override
  String get back => 'Back';

  @override
  String get retry => 'Try again';

  @override
  String get savedOffline =>
      'Saved offline. It will sync automatically when you\'re back online.';

  @override
  String pendingSync(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count actions waiting to sync',
      one: '1 action waiting to sync',
    );
    return '$_temp0';
  }

  @override
  String get syncNow => 'Sync now';

  @override
  String get syncNeedsAttention => 'Needs attention';

  @override
  String get offline => 'You\'re offline';

  @override
  String get dismiss => 'Dismiss';

  @override
  String get newParcel => 'New parcel';

  @override
  String get stepWhat => 'What';

  @override
  String get stepWho => 'To whom';

  @override
  String get stepHow => 'Carrier';

  @override
  String get stepReview => 'Review';

  @override
  String get titleLabel => 'Title';

  @override
  String get titleHint => 'e.g. Quarterly Supplier Agreement';

  @override
  String get descriptionLabel => 'Description';

  @override
  String get descriptionHint => 'What is inside, and any handling instructions';

  @override
  String get receiverEmployee => 'Employee';

  @override
  String get receiverDepartment => 'Department';

  @override
  String get receiverBranch => 'Office';

  @override
  String get receiverExternal => 'External';

  @override
  String get searchEmployee => 'Search name, ID, phone or department';

  @override
  String get destination => 'Destination';

  @override
  String get carrierEmployee => 'ABG employee';

  @override
  String get carrierCourier => 'Courier company';

  @override
  String get carrierGuest => 'Guest person';

  @override
  String get assignLater => 'Let dispatch assign a courier';

  @override
  String get courierCompany => 'Courier company';

  @override
  String get trackingNumberLabel => 'Courier tracking / consignment no.';

  @override
  String get riderName => 'Rider name (optional)';

  @override
  String get riderPhone => 'Rider phone (optional)';

  @override
  String get guestName => 'Full name';

  @override
  String get guestCompany => 'Company (optional)';

  @override
  String get vehicleNumber => 'Vehicle number (optional)';

  @override
  String get externalName => 'Receiver name';

  @override
  String get externalOrg => 'Organisation';

  @override
  String get externalAddress => 'Delivery address';

  @override
  String get expectedDelivery => 'Expected delivery';

  @override
  String get noDeadline => 'No deadline';

  @override
  String get bookParcel => 'Book parcel';

  @override
  String get saveDraft => 'Save as draft';

  @override
  String get reviewNotice =>
      'Booking creates a tracking ID and QR label. Every handover from now on is recorded.';

  @override
  String get bookedTitle => 'Parcel booked';

  @override
  String get bookedBody => 'Attach the QR label to the envelope or package.';

  @override
  String get handoverPin => 'Handover PIN';

  @override
  String get handoverPinHint =>
      'Share this PIN with the courier only at the moment you hand the parcel over.';

  @override
  String get viewParcel => 'View parcel';

  @override
  String get bookAnother => 'Book another';

  @override
  String get required => 'Required';

  @override
  String get scanTitle => 'Scan parcel';

  @override
  String get scanHint => 'Align the QR label inside the frame';

  @override
  String get enterManually => 'Enter tracking ID';

  @override
  String get trackingIdLabel => 'Tracking ID';

  @override
  String get lookUp => 'Look up';

  @override
  String get cameraUnavailable =>
      'Camera unavailable on this device. Enter the tracking ID instead.';

  @override
  String get torch => 'Torch';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get filterAll => 'All';

  @override
  String get filterAction => 'Action required';

  @override
  String get filterUpdates => 'Updates';

  @override
  String get filterSystem => 'System';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get noNotifications => 'No notifications yet';

  @override
  String get profileTitle => 'Profile';

  @override
  String get employeeId => 'Employee ID';

  @override
  String get department => 'Department';

  @override
  String get office => 'Office';

  @override
  String get phone => 'Phone';

  @override
  String get email => 'Email';

  @override
  String get settings => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get pushNotifications => 'Push notifications';

  @override
  String get smsNotifications => 'SMS notifications';

  @override
  String get sessions => 'Signed-in devices';

  @override
  String get thisDevice => 'This device';

  @override
  String get signOut => 'Sign out';

  @override
  String get signOutConfirm => 'Sign out of ABG ONE on this device?';

  @override
  String get help => 'Help & support';

  @override
  String get helpBody =>
      'Contact the dispatch desk at Head Office, Level 2, or call 09612-000100.';

  @override
  String get privacy => 'Privacy & security';

  @override
  String get privacyBody =>
      'Your sign-in is stored in the device\'s secure keystore. QR labels carry no personal data. Every custody action is recorded with your name and the server time.';

  @override
  String version(Object version) {
    return 'Version $version';
  }

  @override
  String get roles => 'Roles';

  @override
  String get errorNetwork =>
      'Can\'t reach ABG ONE. Check your connection and try again.';

  @override
  String get errorGeneric => 'That didn\'t work. Please try again.';

  @override
  String guestHello(Object name) {
    return 'Hello, $name';
  }

  @override
  String get guestAssignments => 'Your assignments';

  @override
  String get guestNoAssignments => 'No active assignments right now.';

  @override
  String get guestSessionNote =>
      'This carrier session only shows parcels assigned to you and ends automatically.';

  @override
  String get justNow => 'Just now';

  @override
  String minutesAgo(int count) {
    return '$count min ago';
  }

  @override
  String hoursAgo(int count) {
    return '$count h ago';
  }

  @override
  String get yesterday => 'Yesterday';

  @override
  String get statusDRAFT => 'Draft';

  @override
  String get statusBOOKED => 'Booked';

  @override
  String get statusAWAITING_PICKUP => 'Awaiting Pickup';

  @override
  String get statusPICKED_UP => 'Picked Up';

  @override
  String get statusIN_TRANSIT => 'In Transit';

  @override
  String get statusARRIVED_AT_DESTINATION => 'Arrived';

  @override
  String get statusPENDING_RECEIPT => 'Pending Receipt';

  @override
  String get statusRECEIVED => 'Received';

  @override
  String get statusON_HOLD => 'On Hold';

  @override
  String get statusDELIVERY_EXCEPTION => 'Exception';

  @override
  String get statusDELIVERY_FAILED => 'Delivery Failed';

  @override
  String get statusRETURN_REQUESTED => 'Return Requested';

  @override
  String get statusRETURN_IN_TRANSIT => 'Return In Transit';

  @override
  String get statusRETURNED => 'Returned';

  @override
  String get statusCANCELLED => 'Cancelled';

  @override
  String get priorityNORMAL => 'Normal';

  @override
  String get priorityPRIORITY => 'Priority';

  @override
  String get priorityURGENT => 'Urgent';

  @override
  String get priorityCRITICAL => 'Critical';

  @override
  String get classNORMAL => 'Normal';

  @override
  String get classINTERNAL => 'Internal';

  @override
  String get classCONFIDENTIAL => 'Confidential';

  @override
  String get classHIGHLY_CONFIDENTIAL => 'Highly Confidential';

  @override
  String get carrierTypeINTERNAL_EMPLOYEE => 'Employee courier';

  @override
  String get carrierTypeEXTERNAL_COURIER => 'Courier company';

  @override
  String get carrierTypeGUEST_PERSON => 'Guest carrier';

  @override
  String get excRECEIVER_UNAVAILABLE => 'Receiver unavailable';

  @override
  String get excWRONG_DESTINATION => 'Wrong destination';

  @override
  String get excADDRESS_CLARIFICATION => 'Address needs clarification';

  @override
  String get excPACKAGE_DAMAGED => 'Package damaged';

  @override
  String get excOFFICE_CLOSED => 'Office closed';

  @override
  String get excSEAL_BROKEN => 'Seal broken';

  @override
  String get excAWAITING_AUTHORIZATION => 'Waiting for authorisation';

  @override
  String get excOTHER => 'Other';

  @override
  String dispatchedTo(Object from, Object to) {
    return '$from → $to';
  }

  @override
  String get trackingCopied => 'Tracking ID copied';

  @override
  String get handoverRequested => 'The sender has been asked to confirm.';

  @override
  String receiptCodeSent(Object phone) {
    return 'Code sent to $phone';
  }

  @override
  String get addEvidence => 'Add photo evidence';

  @override
  String get evidenceAdded => 'Evidence attached';

  @override
  String get evidenceHint =>
      'Photograph the sealed envelope or package — never its contents.';

  @override
  String sentToPhone(Object phone) {
    return 'Sent to $phone';
  }

  @override
  String get you => 'You';

  @override
  String get moreActions => 'More actions';

  @override
  String get incReport => 'Report an incident';

  @override
  String get incReportHint =>
      'Spotted a problem? Snap a photo — your office\'s admins are told at once.';

  @override
  String get incMyReports => 'My reports';

  @override
  String incOpenCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count open reports',
      one: '1 open report',
      zero: 'No open reports',
    );
    return '$_temp0';
  }

  @override
  String get incWhatKind => 'What kind of problem?';

  @override
  String get incTitleLabel => 'Title';

  @override
  String get incTitleHint => 'e.g. Plaster falling from the wall near lift 2';

  @override
  String get incDescriptionLabel => 'What did you see? (optional)';

  @override
  String get incWhere => 'Where is it?';

  @override
  String get incOffice => 'Office';

  @override
  String get incArea => 'Area (optional)';

  @override
  String get incAreaAny => 'Not sure / somewhere in the office';

  @override
  String get incSpot => 'Exact spot (optional)';

  @override
  String get incSpotHint => 'e.g. 3rd floor, beside the lift';

  @override
  String get incHowUrgent => 'How urgent is it?';

  @override
  String get incPhotos => 'Photos';

  @override
  String get incPhotosHint =>
      'Add up to 3 photos. A clear photo helps the team fix it faster.';

  @override
  String get incTakePhoto => 'Take photo';

  @override
  String get incChoosePhoto => 'Gallery';

  @override
  String get incRemovePhoto => 'Remove photo';

  @override
  String get incAnonymous => 'Report anonymously';

  @override
  String get incAnonymousHint =>
      'Admins won\'t see your name. It is kept only so you can follow the status.';

  @override
  String get incMisconductNote =>
      'Misconduct reports go to Head Office only — never to your own office\'s admins.';

  @override
  String get incSubmit => 'Submit report';

  @override
  String incSubmitted(Object ref) {
    return 'Report $ref sent. The admin team has been notified.';
  }

  @override
  String get incTitleRequired => 'Give a short title (at least 3 characters)';

  @override
  String get incCategoryRequired => 'Choose what kind of problem it is';

  @override
  String get incNoReports => 'No reports yet';

  @override
  String get incNoReportsHint =>
      'When you report a problem, you can follow its progress here.';

  @override
  String get incFilterOpen => 'Open';

  @override
  String get incFilterClosed => 'Closed';

  @override
  String get incFilterAll => 'All';

  @override
  String get incStatusPENDING => 'Pending';

  @override
  String get incStatusPROCESSING => 'Processing';

  @override
  String get incStatusDONE => 'Done';

  @override
  String get incStatusDECLINED => 'Declined';

  @override
  String get incCatBUILDING_DAMAGE => 'Building damage';

  @override
  String get incCatCLEANLINESS => 'Cleanliness';

  @override
  String get incCatCAFETERIA_HYGIENE => 'Cafeteria hygiene';

  @override
  String get incCatWASHROOM => 'Washroom';

  @override
  String get incCatSAFETY_HAZARD => 'Safety hazard';

  @override
  String get incCatELECTRICAL => 'Electrical';

  @override
  String get incCatSECURITY => 'Security';

  @override
  String get incCatMISCONDUCT => 'Misconduct';

  @override
  String get incCatOTHER => 'Other';

  @override
  String get incSevLOW => 'Low';

  @override
  String get incSevMEDIUM => 'Medium';

  @override
  String get incSevHIGH => 'High';

  @override
  String get incSevURGENT => 'Urgent';

  @override
  String get incProgress => 'Progress';

  @override
  String get incStepSubmitted => 'Submitted';

  @override
  String get incStepProcessing => 'Processing';

  @override
  String get incStepDone => 'Done';

  @override
  String get incStepDeclined => 'Declined';

  @override
  String get incAdminUpdate => 'Update from the admin team';

  @override
  String get incReportedBy => 'Reported by';

  @override
  String get incAnonymousBadge => 'Anonymous';

  @override
  String get incAddPhoto => 'Add another photo';

  @override
  String get incPhotoAdded => 'Photo added';

  @override
  String get incFixPhotos => 'Photos of the fix';

  @override
  String get incHistory => 'History';

  @override
  String get incEvSubmitted => 'Report submitted';

  @override
  String incEvStatus(Object status) {
    return 'Marked $status';
  }

  @override
  String get incEvReopened => 'Reopened';

  @override
  String get incEvNote => 'Update for you';

  @override
  String get incEvPhoto => 'Photo added';

  @override
  String get incEvDetails => 'Details updated';

  @override
  String get incWaitingForAdmin => 'Waiting for the admin team to pick it up.';

  @override
  String get incOfflineNotice =>
      'You\'re offline. Reports with photos need a connection — try again when you\'re back online.';

  @override
  String get visTitle => 'Visitors';

  @override
  String get visMyVisitors => 'My visitors';

  @override
  String get visGate => 'Gate';

  @override
  String get visInvite => 'Invite a visitor';

  @override
  String get visUpcoming => 'Upcoming';

  @override
  String get visPast => 'Past';

  @override
  String get visNoUpcoming => 'No visitors coming';

  @override
  String get visNoUpcomingHint =>
      'Invite a visitor and they get a gate pass number by SMS. You are told when they arrive and leave.';

  @override
  String get visNoPast => 'No past visitors yet';

  @override
  String get visStatusEXPECTED => 'Expected';

  @override
  String get visStatusCHECKED_IN => 'On site';

  @override
  String get visStatusCHECKED_OUT => 'Checked out';

  @override
  String get visStatusCANCELLED => 'Cancelled';

  @override
  String get visStatusEXPIRED => 'Did not arrive';

  @override
  String visStatusSemantics(Object status) {
    return 'Status: $status';
  }

  @override
  String get visPurposeMEETING => 'Meeting';

  @override
  String get visPurposeINTERVIEW => 'Interview';

  @override
  String get visPurposeVENDOR_SUPPLIER => 'Vendor / supplier';

  @override
  String get visPurposeCONTRACTOR => 'Contractor work';

  @override
  String get visPurposeAUDIT_INSPECTION => 'Audit / inspection';

  @override
  String get visPurposeGOVERNMENT_OFFICIAL => 'Government official';

  @override
  String get visPurposeDELIVERY => 'Delivery';

  @override
  String get visPurposePERSONAL => 'Personal';

  @override
  String get visPurposeOTHER => 'Other';

  @override
  String get visWalkIn => 'Walk-in';

  @override
  String get visOverstay => 'Past expected time';

  @override
  String visInSince(Object time) {
    return 'In since $time';
  }

  @override
  String visLeftAt(Object time) {
    return 'Left at $time';
  }

  @override
  String visExpectedAt(Object time) {
    return 'Expected $time';
  }

  @override
  String visHostIs(Object name) {
    return 'Host: $name';
  }

  @override
  String get visCheckIn => 'Check in';

  @override
  String get visCheckOut => 'Check out';

  @override
  String visCheckedIn(Object name) {
    return '$name checked in — the host has been told.';
  }

  @override
  String visCheckedOut(Object name) {
    return '$name checked out.';
  }

  @override
  String get visPassTitle => 'Visitor gate pass';

  @override
  String visQrSemantics(Object number) {
    return 'QR code for gate pass $number';
  }

  @override
  String get visCopyPassNumber => 'Copy pass number';

  @override
  String get visPassNumberCopied => 'Pass number copied';

  @override
  String get visValidToday =>
      'Valid today only · show it at the gate in and out';

  @override
  String visValidOn(Object date) {
    return 'Valid on $date only · show it at the gate in and out';
  }

  @override
  String get visHost => 'Host';

  @override
  String get visPurpose => 'Purpose';

  @override
  String get visArea => 'Area';

  @override
  String get visTime => 'Time';

  @override
  String get visParty => 'Party';

  @override
  String visPartyCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String get visVehicle => 'Vehicle number';

  @override
  String get visNone => 'None';

  @override
  String get visCarrying => 'Carrying';

  @override
  String get visPassFooter =>
      'Wear the visitor badge on site and return it at the gate. Issued by ABG ONE.';

  @override
  String get visLiveOnSite => 'Live · on site now';

  @override
  String visOnSiteSemantics(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count visitors on site now',
      one: '1 visitor on site now',
      zero: 'Nobody on site now',
    );
    return '$_temp0';
  }

  @override
  String get visCounting => 'Counting…';

  @override
  String visPeopleOnSite(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people on site',
      one: '1 person on site',
    );
    return '$_temp0';
  }

  @override
  String visStillExpected(int count) {
    return '$count still expected today';
  }

  @override
  String visOverstaying(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count visitors past their expected time',
      one: '1 visitor past their expected time',
    );
    return '$_temp0';
  }

  @override
  String visLongest(Object name, Object time) {
    return 'Longest on site: $name · $time';
  }

  @override
  String get visScanPass => 'Scan pass';

  @override
  String get visWalkInAction => 'Walk-in';

  @override
  String get visStatCheckedOut => 'Checked out today';

  @override
  String get visStatWalkIns => 'Walk-ins today';

  @override
  String get visStatVisits => 'Visits today';

  @override
  String get visPassNumberHint => 'Type a pass number, e.g. VP-261021-FCA-012';

  @override
  String get visVerify => 'Verify pass';

  @override
  String get visOnSiteNow => 'On site now';

  @override
  String get visExpectedToday => 'Expected today';

  @override
  String get visNobodyOnSite => 'Nobody is on site right now.';

  @override
  String get visNobodyExpected => 'Nobody else is expected today.';

  @override
  String get visWalkInTitle => 'Register a walk-in';

  @override
  String get visInviteHint =>
      'You are the host. Your visitor gets the gate pass number by SMS, and you are told when they arrive and leave.';

  @override
  String get visWalkInHint =>
      'For someone who arrived without a pass. They are checked in now and their host is told they are at the gate.';

  @override
  String get visVisitorSection => 'Visitor';

  @override
  String get visVisitor => 'Visitor';

  @override
  String get visNameLabel => 'Visitor\'s name';

  @override
  String get visPhoneLabel => 'Mobile number';

  @override
  String get visPhoneHelper => 'The gate pass number is texted here.';

  @override
  String get visCompanyLabel => 'Company or organisation';

  @override
  String get visCompanyHint => 'e.g. Akij Packaging Ltd, DIFE Narayanganj';

  @override
  String get visPurposeTitle => 'Purpose of the visit';

  @override
  String get visDetailLabel => 'What for (optional)';

  @override
  String get visDetailHint => 'e.g. Carton sample approval';

  @override
  String get visHereToSee => 'Here to see';

  @override
  String get visSearchDirectory => 'Search directory';

  @override
  String get visNotListed => 'Not listed?';

  @override
  String get visHostNameLabel => 'Name of the person or team being visited';

  @override
  String get visChooseHost => 'Choose the employee being visited';

  @override
  String get visHostNoAccount => 'Not on ABG ONE — tell them in person';

  @override
  String get visHostSearchHint => 'Name, employee ID or department';

  @override
  String get visWhenWhere => 'When and where';

  @override
  String get visDate => 'Date';

  @override
  String get visFrom => 'From';

  @override
  String get visUntil => 'Until';

  @override
  String get visLeaveBy => 'Expected to leave by';

  @override
  String get visOptional => 'Optional';

  @override
  String get visClear => 'Clear';

  @override
  String get visOffice => 'Office';

  @override
  String get visAreaAny => 'Anywhere in the office';

  @override
  String get visPartyLabel => 'People on this pass';

  @override
  String get visPartyFewer => 'One fewer person';

  @override
  String get visPartyMore => 'One more person';

  @override
  String get visAtTheGate => 'For the gate';

  @override
  String get visBadgeLabel => 'Badge number (optional)';

  @override
  String get visCarryingHint => 'e.g. Laptop, tools, samples';

  @override
  String get visIdLast4Label => 'ID card — last 4 only';

  @override
  String get visIdLast4Helper => 'Never type the full NID number.';

  @override
  String get visNotesLabel => 'Note for the gate';

  @override
  String get visSubmitInvite => 'Create gate pass';

  @override
  String get visSubmitWalkIn => 'Register and check in';

  @override
  String get visNameRequired => 'Enter the visitor\'s name.';

  @override
  String get visPhoneInvalid =>
      'Enter a Bangladeshi mobile number, e.g. 01711 223344.';

  @override
  String get visPurposeRequired => 'Choose the purpose of the visit.';

  @override
  String get visIdLast4Invalid => 'ID: only the last 4 digits or letters.';

  @override
  String get visHostRequired => 'Say who the visitor has come to see.';

  @override
  String get visUntilPassed => 'That leaving time has already passed.';

  @override
  String get visTimePast =>
      'That time has already passed. Choose a time from now on.';

  @override
  String get visUntilBeforeStart => 'The visit must end after it starts.';

  @override
  String visPassCreated(Object pass) {
    return 'Gate pass $pass created — the visitor has been sent the number by SMS.';
  }

  @override
  String visWalkInDone(Object name, Object pass) {
    return '$name is checked in with pass $pass.';
  }

  @override
  String get visCopy => 'Copy number';

  @override
  String get visSendSms => 'Send by SMS';

  @override
  String get visDetailsCopied => 'Pass details copied';

  @override
  String visSmsText(Object office, Object time, Object host, Object pass) {
    return 'ABG gate pass $pass · $office · $time · Host: $host. Please show this at the gate.';
  }

  @override
  String get visPassHidden =>
      'Only the host and this office\'s gate staff can see the QR gate pass.';

  @override
  String get visProgress => 'Where the visit stands';

  @override
  String get visDetails => 'Details';

  @override
  String get visStepExpected => 'Expected';

  @override
  String get visStepWalkIn => 'Walk-in registered';

  @override
  String get visStepOnSite => 'Checked in';

  @override
  String get visStepOut => 'Checked out';

  @override
  String get visStepCancelled => 'Cancelled';

  @override
  String get visStepExpired => 'Did not arrive';

  @override
  String get visStepExpiredHint => 'The pass lapsed at the end of its day.';

  @override
  String visBy(Object name) {
    return 'by $name';
  }

  @override
  String visOnSiteFor(Object time) {
    return '$time on site';
  }

  @override
  String visCheckInTitle(Object name) {
    return 'Check in $name?';
  }

  @override
  String get visCheckInBody =>
      'Check their ID card and hand over a visitor badge. The host is told at once.';

  @override
  String visCheckInBodyId(Object last4) {
    return 'Compare the ID card (last 4: $last4) and hand over a visitor badge. The host is told at once.';
  }

  @override
  String visCheckOutTitle(Object name) {
    return 'Check out $name?';
  }

  @override
  String get visCheckOutBody =>
      'The pass cannot be used again after check-out.';

  @override
  String visCheckOutBodyBadge(Object badge) {
    return 'Collect badge $badge. The pass cannot be used again after check-out.';
  }

  @override
  String get visCancelPass => 'Cancel pass';

  @override
  String get visCancelTitle => 'Cancel this gate pass?';

  @override
  String visCancelBody(Object name) {
    return '$name is sent an SMS that the visit is cancelled, and the pass stops working at the gate.';
  }

  @override
  String get visCancelReason => 'Reason (optional)';

  @override
  String get visCancelled =>
      'Gate pass cancelled — the visitor has been told by SMS.';

  @override
  String get visPassNotFound => 'Pass not recognised';

  @override
  String get visPassNotFoundHint =>
      'Do not admit the visitor on it — call the host or register them as a walk-in.';

  @override
  String get visScanAnother => 'Scan another pass';

  @override
  String get visBlockWrongOffice => 'Wrong office';

  @override
  String get visBlockWrongDay => 'Not valid today';

  @override
  String get visBlockCancelled => 'Pass cancelled';

  @override
  String get visBlockExpired => 'Pass expired';

  @override
  String get visBlockAlreadyOut => 'Pass already used';

  @override
  String get visBlockGeneric => 'Not valid';

  @override
  String get visVerdictValid => 'Valid pass';

  @override
  String visVerdictValidBody(Object time, Object host) {
    return 'Expected $time to see $host. Check the ID, then check the visitor in.';
  }

  @override
  String get visVerdictOnSite => 'On site';

  @override
  String visVerdictOnSiteBody(Object time) {
    return 'Checked in at $time. Check them out as they leave.';
  }

  @override
  String get visVerdictGenuine => 'Genuine pass';

  @override
  String get visVerdictGenuineBody =>
      'Your role can verify passes but not check visitors in or out. Ask security or the front desk.';

  @override
  String get visIdCompare => 'Compare with the ID card — last 4';

  @override
  String get visOpenVisit => 'Open the visit';
}
