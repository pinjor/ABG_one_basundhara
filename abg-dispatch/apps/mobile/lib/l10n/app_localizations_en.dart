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
  String get tourTitle => 'Official tours';

  @override
  String get tourApply => 'Apply for a tour';

  @override
  String get tourMyRequests => 'My requests';

  @override
  String get tourToApprove => 'To approve';

  @override
  String get tourFilterAll => 'All';

  @override
  String get tourFilterOpen => 'In progress';

  @override
  String get tourFilterClosed => 'Closed';

  @override
  String get tourNoRequests => 'No tour requests yet';

  @override
  String get tourNoRequestsHint =>
      'Apply for a local or overseas tour and follow every approval here.';

  @override
  String get tourNothingToApprove => 'Nothing is waiting for you';

  @override
  String get tourNothingToApproveHint =>
      'Requests you need to approve, vet or sanction appear here.';

  @override
  String tourWaitingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count requests waiting for you',
      one: '1 request waiting for you',
    );
    return '$_temp0';
  }

  @override
  String get tourYourDecision => 'Your decision';

  @override
  String get tourReview => 'Review';

  @override
  String tourSanctioned(Object amount) {
    return 'Sanctioned $amount';
  }

  @override
  String get tourStatusPENDING_HOD => 'Pending HOD approval';

  @override
  String get tourStatusPENDING_VETTING => 'HR & Finance vetting';

  @override
  String get tourStatusPENDING_SANCTION => 'MD / Chairman sanction';

  @override
  String get tourStatusAPPROVED => 'Approved & funds sanctioned';

  @override
  String get tourStatusACTIVE => 'Tour active';

  @override
  String get tourStatusCOMPLETED => 'Completed';

  @override
  String get tourStatusREJECTED => 'Rejected';

  @override
  String get tourStatusCANCELLED => 'Cancelled';

  @override
  String get tourTypeLOCAL => 'Local';

  @override
  String get tourTypeFOREIGN => 'Foreign';

  @override
  String get tourPurposeCONFERENCE => 'Conference';

  @override
  String get tourPurposeTECHNICAL_INSPECTION => 'Technical inspection';

  @override
  String get tourPurposeVENDOR_AUDIT => 'Vendor audit';

  @override
  String get tourPurposeTRAINING => 'Training';

  @override
  String get tourPurposeCLIENT_MEETING => 'Client meeting';

  @override
  String get tourPurposePLANT_VISIT => 'Plant / site visit';

  @override
  String get tourPurposeOTHER => 'Other';

  @override
  String get tourTransportAIR => 'Air';

  @override
  String get tourTransportROAD => 'Road';

  @override
  String get tourTransportRAIL => 'Rail';

  @override
  String get tourTransportWATER => 'Water';

  @override
  String get tourTransportPOOL_CAR => 'Pool car';

  @override
  String get tourAwaitingHOD => 'Head of department';

  @override
  String get tourAwaitingVETTING => 'HR & Finance';

  @override
  String get tourAwaitingSANCTION => 'MD / Chairman';

  @override
  String tourDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days',
      one: '1 day',
    );
    return '$_temp0';
  }

  @override
  String get tourPipeline => 'Approval pipeline';

  @override
  String get tourStageSUBMITTED => 'Submitted';

  @override
  String get tourStagePENDING_HOD => 'HOD approval';

  @override
  String get tourStagePENDING_VETTING => 'HR & Finance vetting';

  @override
  String get tourStagePENDING_SANCTION => 'MD / Chairman sanction';

  @override
  String get tourStageAPPROVED => 'Funds sanctioned';

  @override
  String get tourStageACTIVE => 'On tour';

  @override
  String get tourStageCOMPLETED => 'Completed';

  @override
  String tourWaitingFor(Object name) {
    return 'Waiting for $name';
  }

  @override
  String tourStageRejectedBy(Object name) {
    return 'Rejected by $name';
  }

  @override
  String get tourStageCancelled => 'Cancelled by the traveller';

  @override
  String get tourStageSkipped => 'Not reached';

  @override
  String get tourStageInProgress => 'In progress';

  @override
  String get tourFormIntro =>
      'Your head of department approves first, then HR & Finance vet the budget. Overseas tours also need the MD\'s or Chairman\'s sanction.';

  @override
  String get tourWhere => 'Where are you going?';

  @override
  String get tourLocalHint => 'Within Bangladesh';

  @override
  String get tourForeignHint => 'Overseas · needs sanction';

  @override
  String get tourPurposeLabel => 'Purpose';

  @override
  String get tourTitleLabel => 'Title';

  @override
  String get tourTitleHint => 'e.g. Compressor vendor audit';

  @override
  String get tourDestinationLabel => 'Destination';

  @override
  String get tourDestinationHint => 'e.g. Chattogram LPG refinery';

  @override
  String get tourCityLabel => 'City / site';

  @override
  String get tourCountryLabel => 'Country';

  @override
  String get tourDatesLabel => 'Travel dates';

  @override
  String get tourPickDates => 'Choose your travel dates';

  @override
  String get tourTransportLabel => 'Transport';

  @override
  String get tourCoTravellers => 'Co-travellers';

  @override
  String get tourCoTravellerHint => 'Name of a colleague on the same trip';

  @override
  String get tourCoTravellerAdd => 'Add co-traveller';

  @override
  String tourRemove(Object name) {
    return 'Remove $name';
  }

  @override
  String get tourBudgetSection => 'Budget';

  @override
  String get tourEstimatedBudget => 'Estimated budget (৳)';

  @override
  String get tourBudgetHint => 'Fares, hotel, per diem and local transport';

  @override
  String get tourAdvance => 'Advance requested (৳)';

  @override
  String get tourPassportSection => 'Passport';

  @override
  String get tourPassportNumber => 'Passport number';

  @override
  String get tourPassportExpiry => 'Passport expiry date';

  @override
  String get tourPassportWarning =>
      'Your passport expires within 6 months of your return. Most countries need 6 months\' validity — start the renewal now.';

  @override
  String get tourPassportExpired =>
      'Your passport expires before you return. Renew it before applying.';

  @override
  String get tourApprover => 'Approver';

  @override
  String get tourApproverHint => 'Your head of department approves first.';

  @override
  String get tourChange => 'Change';

  @override
  String get tourChooseApprover => 'Choose approver';

  @override
  String get tourNoManager =>
      'No line manager on record — choose who approves.';

  @override
  String tourManagerNoAccount(Object name) {
    return '$name has no ABG ONE account — choose someone else.';
  }

  @override
  String get tourSearchPeople => 'Search by name, ID or designation';

  @override
  String get tourNoAccount => 'No account';

  @override
  String get tourDescriptionLabel => 'Details (optional)';

  @override
  String get tourDescriptionHint =>
      'Agenda, people you will meet, what the company gains';

  @override
  String get tourSubmit => 'Submit request';

  @override
  String tourSubmitted(Object reference) {
    return '$reference sent for approval';
  }

  @override
  String get tourErrTitle => 'Give the tour a short title.';

  @override
  String get tourErrDestination => 'Say where you are going.';

  @override
  String get tourErrCountry => 'Give the destination country.';

  @override
  String get tourErrDates => 'Choose your travel dates.';

  @override
  String get tourErrBudget => 'Enter the estimated budget in Taka.';

  @override
  String get tourErrAdvance => 'The advance cannot be more than the budget.';

  @override
  String get tourErrPassport => 'Enter your passport number and expiry date.';

  @override
  String get tourErrApprover => 'Choose who approves this tour.';

  @override
  String get tourOfflineNotice =>
      'You\'re offline. Tour requests need a connection — try again when you\'re back online.';

  @override
  String get tourTrip => 'Trip';

  @override
  String get tourDeparture => 'Departure';

  @override
  String get tourReturn => 'Return';

  @override
  String get tourDuration => 'Duration';

  @override
  String get tourOffice => 'Office';

  @override
  String get tourBudgetEstimated => 'Estimated';

  @override
  String get tourBudgetAdvance => 'Advance';

  @override
  String get tourBudgetSanctioned => 'Sanctioned';

  @override
  String get tourNotYet => 'Not yet';

  @override
  String get tourNone => 'None';

  @override
  String get tourTraveller => 'Traveller';

  @override
  String get tourHod => 'Head of department';

  @override
  String get tourAlone => 'Travelling alone';

  @override
  String get tourValidUntil => 'Valid until';

  @override
  String get tourHistory => 'History';

  @override
  String get tourPassportAlertTitle => 'Passport needs renewal';

  @override
  String tourPassportAlertBody(Object expiry, Object end) {
    return 'Valid until $expiry; the tour ends $end. Most countries need six months\' validity — renew before booking.';
  }

  @override
  String tourStartableFrom(Object date) {
    return 'Approved and funds sanctioned. You can start the tour from $date.';
  }

  @override
  String get tourSeparation =>
      'You approved this as head of department, so another HR & Finance member must vet it.';

  @override
  String get tourLatestNote => 'Latest note';

  @override
  String get tourActApprove => 'Approve';

  @override
  String get tourActVet => 'Vet & forward';

  @override
  String get tourActApproveSanction => 'Approve & sanction';

  @override
  String get tourActSanction => 'Sanction tour';

  @override
  String get tourActReject => 'Reject';

  @override
  String get tourActStart => 'Start tour';

  @override
  String get tourActComplete => 'Mark completed';

  @override
  String get tourActCancel => 'Cancel request';

  @override
  String get tourActNote => 'Add note';

  @override
  String get tourApproveHod => 'Approve as head of department';

  @override
  String get tourApproveHodHint =>
      'It goes to HR & Finance for budget vetting next.';

  @override
  String get tourVetHint =>
      'Confirm the amount to sanction. The MD / Chairman are asked next.';

  @override
  String get tourVetLocalHint =>
      'HR & Finance approval completes a local tour and sanctions the funds.';

  @override
  String get tourSanctionHint =>
      'Your sanction approves the tour and releases the funds.';

  @override
  String get tourRejectHint => 'A reason is required — the traveller sees it.';

  @override
  String get tourCancelHint =>
      'A reason is required. Whoever is handling it is told.';

  @override
  String get tourStartHint =>
      'Your head of department is told you are on your way.';

  @override
  String get tourCompleteHint =>
      'Closes the tour. Any advance goes to HR & Finance for settlement.';

  @override
  String get tourNoteHint => 'Kept in the history; the other side is told.';

  @override
  String get tourReason => 'Reason';

  @override
  String get tourNoteOptional => 'Note (optional)';

  @override
  String get tourNoteLabel => 'Note';

  @override
  String get tourSanctionedBudget => 'Sanctioned budget (৳)';

  @override
  String get tourReasonRequired => 'Write a short reason.';

  @override
  String get tourDoneApproved => 'Approved — the next approver has been told.';

  @override
  String get tourDoneSanctioned =>
      'Approved — funds sanctioned and the traveller told.';

  @override
  String get tourDoneRejected => 'Rejected — the traveller has been told why.';

  @override
  String get tourDoneStarted => 'Tour started. Safe travels!';

  @override
  String get tourDoneCompleted => 'Tour marked completed.';

  @override
  String get tourDoneCancelled => 'Request cancelled.';

  @override
  String get tourDoneNote => 'Note added.';

  @override
  String get tourEvSubmitted => 'Applied';

  @override
  String get tourEvHod => 'Approved by head of department';

  @override
  String get tourEvVetted => 'Vetted by HR & Finance';

  @override
  String get tourEvApproved => 'Approved & funds sanctioned';

  @override
  String get tourEvSanctioned => 'Sanctioned by MD / Chairman';

  @override
  String get tourEvRejected => 'Rejected';

  @override
  String get tourEvStarted => 'Tour started';

  @override
  String get tourEvCompleted => 'Tour completed';

  @override
  String get tourEvCancelled => 'Request cancelled';

  @override
  String get tourEvNote => 'Note';

  @override
  String tourEvBudget(Object amount) {
    return 'Sanctioned budget set to $amount';
  }
}
