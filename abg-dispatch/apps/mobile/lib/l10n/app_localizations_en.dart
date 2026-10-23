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
  String get apprTitle => 'Approvals';

  @override
  String get apprEmpty => 'Nothing is waiting for you';

  @override
  String get apprEmptyHint =>
      'Tour and pool car requests that need your approval appear here.';

  @override
  String get apprAll => 'All';

  @override
  String get apprTours => 'Official tours';

  @override
  String get apprPoolCar => 'Pool car';

  @override
  String get apprApprove => 'Approve';

  @override
  String get apprReject => 'Reject';

  @override
  String get apprRejectTitle => 'Reject this request?';

  @override
  String get apprRejectReason => 'Reason (shown to the requester)';

  @override
  String get apprApproveTitle => 'Approve this request?';

  @override
  String get apprNote => 'Note (optional)';

  @override
  String get apprApproved => 'Approved — the requester has been told.';

  @override
  String get apprRejected => 'Rejected — the requester has been told.';

  @override
  String get apprAwaitingHOD => 'Your approval as head of department';

  @override
  String get apprAwaitingVETTING => 'HR & Finance vetting';

  @override
  String get apprAwaitingSANCTION => 'MD / Chairman sanction';

  @override
  String get apprForeign => 'Foreign';

  @override
  String get apprLocal => 'Local';

  @override
  String get apprUrgent => 'Urgent';

  @override
  String apprPassengers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count passengers',
      one: '1 passenger',
    );
    return '$_temp0';
  }

  @override
  String apprBudget(Object amount) {
    return 'Budget ৳$amount';
  }

  @override
  String apprRequestedBy(Object name) {
    return 'Requested by $name';
  }

  @override
  String get apprDetails => 'Details';

  @override
  String get pcTitle => 'Pool car';

  @override
  String get pcRequestCar => 'Request a car';

  @override
  String get pcTabMine => 'My requests';

  @override
  String get pcTabApprove => 'To approve';

  @override
  String get pcTabTrips => 'My trips';

  @override
  String get pcFilterAll => 'All';

  @override
  String get pcFilterOpen => 'Active';

  @override
  String get pcFilterClosed => 'Closed';

  @override
  String get pcNoRequests => 'No car requests yet';

  @override
  String get pcNoRequestsHint =>
      'Request a pool car for an official trip. Once it is assigned you will see the driver and your gate pass here.';

  @override
  String get pcNoApprovals => 'Nothing to approve';

  @override
  String get pcNoApprovalsHint =>
      'Car requests from your team that name you as head of department appear here.';

  @override
  String get pcNoTrips => 'No trips assigned';

  @override
  String get pcNoTripsHint =>
      'Trips the fleet manager gives you appear here, with Start and Complete.';

  @override
  String get pcUrgent => 'Urgent';

  @override
  String pcPeople(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String pcSeats(int count) {
    return '$count seats';
  }

  @override
  String get pcStatusPENDING_HOD => 'Pending HOD';

  @override
  String get pcStatusPENDING_FLEET => 'Pending fleet manager';

  @override
  String get pcStatusASSIGNED => 'Assigned';

  @override
  String get pcStatusIN_PROGRESS => 'In progress';

  @override
  String get pcStatusCOMPLETED => 'Completed';

  @override
  String get pcStatusREJECTED => 'Rejected';

  @override
  String get pcStatusCANCELLED => 'Cancelled';

  @override
  String get pcTripONE_WAY => 'One way';

  @override
  String get pcTripROUND_TRIP => 'Round trip';

  @override
  String get pcTripFULL_DAY => 'Full day';

  @override
  String get pcTripAIRPORT => 'Airport transfer';

  @override
  String get pcTripHintONE_WAY => 'Drop only';

  @override
  String get pcTripHintROUND_TRIP => 'There and back';

  @override
  String get pcTripHintFULL_DAY => 'Car stays with you';

  @override
  String get pcTripHintAIRPORT => 'Pickup or drop';

  @override
  String get pcVehANY => 'Any car';

  @override
  String get pcVehSEDAN => 'Sedan';

  @override
  String get pcVehSUV => 'SUV';

  @override
  String get pcVehMICROBUS => 'Microbus';

  @override
  String get pcVehPICKUP => 'Pickup';

  @override
  String get pcVehCOASTER => 'Coaster';

  @override
  String get pcFormTitle => 'Request a pool car';

  @override
  String get pcFormIntro =>
      'Your head of department approves, then the fleet manager assigns a car and driver. You get the driver\'s number and a QR gate pass.';

  @override
  String get pcTripKind => 'Kind of trip';

  @override
  String get pcPurpose => 'Purpose of the trip';

  @override
  String get pcPurposeHint => 'e.g. Hearing at the Supreme Court';

  @override
  String get pcPickupFrom => 'Pick up from';

  @override
  String get pcGoingTo => 'Going to';

  @override
  String get pcPickupTime => 'Pickup';

  @override
  String get pcReturnTime => 'Back by';

  @override
  String get pcReturnOptional => 'Back by (optional)';

  @override
  String get pcChooseTime => 'Choose date and time';

  @override
  String get pcClearReturn => 'No return';

  @override
  String get pcPassengers => 'Passengers';

  @override
  String get pcAddPassenger => 'Add passenger';

  @override
  String get pcPassengerName => 'Full name';

  @override
  String get pcPassengerPhone => 'Mobile (optional)';

  @override
  String get pcRemovePassenger => 'Remove passenger';

  @override
  String get pcPeopleCount => 'People travelling';

  @override
  String pcPeopleCountHint(int max) {
    return 'Including you · at most $max';
  }

  @override
  String get pcVehiclePreference => 'Vehicle preference';

  @override
  String get pcUrgentHint =>
      'Needed at short notice — your approver sees it first';

  @override
  String get pcApprover => 'Approver';

  @override
  String get pcApproverHint => 'Your head of department';

  @override
  String get pcChange => 'Change';

  @override
  String get pcNoManager =>
      'No head of department on record — choose an approver';

  @override
  String pcApproverNoAccount(Object name) {
    return '$name cannot sign in to approve. Choose someone else.';
  }

  @override
  String get pcSearchApprover => 'Search name, ID or department';

  @override
  String get pcNoAccount => 'No account';

  @override
  String get pcSend => 'Send for approval';

  @override
  String pcSent(Object ref) {
    return '$ref sent for approval';
  }

  @override
  String get pcPurposeRequired => 'Say what the car is for';

  @override
  String get pcPlacesRequired => 'Give the pickup and drop places';

  @override
  String get pcPickupPast => 'The pickup time has passed';

  @override
  String get pcReturnRequired => 'Round trips and full days need a return time';

  @override
  String get pcReturnBeforePickup => 'The return must be after the pickup';

  @override
  String get pcTooManyNamed => 'More names than people travelling';

  @override
  String get pcApproverRequired => 'Choose who approves this request';

  @override
  String get pcProgress => 'Progress';

  @override
  String get pcStepHod => 'HOD';

  @override
  String get pcStepFleet => 'Fleet';

  @override
  String get pcStepAssigned => 'Assigned';

  @override
  String get pcStepOnTrip => 'On trip';

  @override
  String get pcStepDone => 'Done';

  @override
  String pcWaitingHod(Object name) {
    return 'Waiting for $name to approve.';
  }

  @override
  String get pcWaitingFleet =>
      'Approved. The fleet manager assigns a car and driver next.';

  @override
  String get pcTrip => 'Trip';

  @override
  String get pcVehicleWanted => 'Vehicle wanted';

  @override
  String get pcCarDriver => 'Car & driver';

  @override
  String get pcCallDriver => 'Call driver';

  @override
  String get pcDriver => 'Driver';

  @override
  String get pcNotAssignedYet =>
      'A car and driver are assigned after approval. You will see the driver\'s number and your gate pass here.';

  @override
  String get pcNoCar => 'No car was assigned.';

  @override
  String get pcGatePass => 'Gate pass';

  @override
  String get pcShowPass => 'Show gate pass';

  @override
  String get pcPassHint =>
      'Show this at the gate. Security scans it when the car leaves and when it returns.';

  @override
  String pcPassValid(Object from, Object until) {
    return 'Valid $from – $until';
  }

  @override
  String pcOdometerRun(Object start, Object end, Object distance) {
    return '$start → $end km · $distance km driven';
  }

  @override
  String get pcHistory => 'History';

  @override
  String get pcEvSubmitted => 'Requested';

  @override
  String get pcEvApproved => 'Approved by head of department';

  @override
  String get pcEvRejected => 'Rejected';

  @override
  String get pcEvCancelled => 'Cancelled';

  @override
  String get pcEvAssigned => 'Car assigned';

  @override
  String get pcEvReassigned => 'Car changed';

  @override
  String get pcEvStarted => 'Trip started';

  @override
  String get pcEvCompleted => 'Trip completed';

  @override
  String get pcEvExit => 'Left through the gate';

  @override
  String get pcEvReturn => 'Back through the gate';

  @override
  String get pcRequestedBy => 'Requested by';

  @override
  String get pcHod => 'Head of department';

  @override
  String get pcApprove => 'Approve';

  @override
  String get pcReject => 'Reject';

  @override
  String get pcAssign => 'Assign car';

  @override
  String get pcReassign => 'Reassign';

  @override
  String get pcStart => 'Start trip';

  @override
  String get pcComplete => 'Complete trip';

  @override
  String get pcCancelRequest => 'Cancel request';

  @override
  String get pcApproveTitle => 'Approve this request?';

  @override
  String get pcApproveBody =>
      'It goes to the fleet manager, who assigns a car and driver. The requester is told.';

  @override
  String get pcRejectTitle => 'Reject this request';

  @override
  String get pcRejectReason => 'Reason for the requester';

  @override
  String get pcReasonRequired => 'Give a reason of at least 3 characters';

  @override
  String get pcCancelTitle => 'Cancel this request?';

  @override
  String get pcCancelBody =>
      'The approver or fleet manager is told. An assigned car and driver are released and the gate pass stops working.';

  @override
  String get pcCancelReason => 'Reason (optional)';

  @override
  String get pcOdometer => 'Odometer reading (km, optional)';

  @override
  String get pcStartTitle => 'Start the trip';

  @override
  String get pcCompleteTitle => 'Complete the trip';

  @override
  String pcLastOdometer(Object km) {
    return 'Last recorded $km km';
  }

  @override
  String get pcApproved => 'Approved — sent to the fleet manager';

  @override
  String get pcRejected => 'Rejected — the requester has been told';

  @override
  String get pcStarted => 'Trip started';

  @override
  String get pcCompleted => 'Trip completed — the car is free again';

  @override
  String get pcCancelled => 'Request cancelled';

  @override
  String get pcAssigned => 'Car and driver assigned';

  @override
  String get pcChooseVehicle => 'Vehicle';

  @override
  String get pcChooseDriver => 'Driver';

  @override
  String get pcFreeForTrip => 'Free for this trip';

  @override
  String get pcMatchesRequest => 'Matches request';

  @override
  String get pcReassignNote =>
      'Reassigning issues a new gate pass; the old QR stops working.';

  @override
  String get pcPassTitle => 'Vehicle gate pass';

  @override
  String get pcPassVALID => 'Valid gate pass';

  @override
  String get pcPassOUT => 'Car is out on this trip';

  @override
  String get pcPassUSED => 'Trip complete — pass used';

  @override
  String get pcPassCANCELLED => 'Not valid — trip cancelled';

  @override
  String get pcPassEXPIRED => 'Not valid — pass expired';

  @override
  String get pcPassNOT_YET_VALID => 'Not valid yet';

  @override
  String get pcPassINVALID => 'Not a valid gate pass';

  @override
  String get pcPassInvalidBody =>
      'This code was not issued by ABG ONE, or it has been replaced. Do not let the vehicle through — call the fleet desk.';

  @override
  String get pcRecordExit => 'Record exit';

  @override
  String get pcRecordReturn => 'Record return';

  @override
  String get pcExitRecorded => 'Exit recorded — the trip has started';

  @override
  String get pcReturnRecorded => 'Return recorded — the trip is complete';

  @override
  String get pcGateRecord => 'Gate record';

  @override
  String get pcLeftGate => 'Left the gate';

  @override
  String get pcReturned => 'Returned';

  @override
  String get pcPassNotAllowed =>
      'Only security, front desks and the fleet manager can verify gate passes.';

  @override
  String pcTravelling(int count) {
    return '$count travelling';
  }

  @override
  String get pcValidity => 'Pass valid';

  @override
  String pcLicence(Object number) {
    return 'Licence $number';
  }

  @override
  String get pcRequester => 'Requester';

  @override
  String get navMyAbg => 'My ABG';

  @override
  String get navQrScan => 'QR Scan';

  @override
  String get navInbox => 'Inbox';

  @override
  String get homeSeeMore => 'See more';

  @override
  String get homeSeeLess => 'See less';

  @override
  String get homeSearchTooltip => 'Search services';

  @override
  String get homeSearchHint => 'Search services, e.g. pool car';

  @override
  String homeSearchEmpty(Object query) {
    return 'No service matches “$query”';
  }

  @override
  String get homeSearchParcels => 'Search parcels by tracking ID';

  @override
  String get homeMenuTooltip => 'My ABG';

  @override
  String get homeGlance => 'At a glance';

  @override
  String get homeParcelsSection => 'Parcels';

  @override
  String get svcSendParcel => 'Send parcel';

  @override
  String get svcMyParcels => 'My parcels';

  @override
  String get svcPoolCar => 'Pool car';

  @override
  String get svcReportIssue => 'Report issue';

  @override
  String get svcVisitors => 'Visitors';

  @override
  String get svcTours => 'Tour request';

  @override
  String get svcNotices => 'Notice board';

  @override
  String get svcApprovals => 'Approvals';

  @override
  String get svcScan => 'Scan & receive';

  @override
  String get svcMyReports => 'My reports';

  @override
  String get svcLicences => 'Licences';

  @override
  String get svcMyTrips => 'My trips';

  @override
  String get svcGateDesk => 'Gate desk';

  @override
  String get glanceWaiting => 'Parcels waiting';

  @override
  String get glanceInTransit => 'In transit';

  @override
  String get glanceApprovals => 'To approve';

  @override
  String get glanceReports => 'Open reports';

  @override
  String get glanceNotices => 'Unread notices';

  @override
  String get bannerRead => 'Read';

  @override
  String get bannerUrgent => 'Urgent';

  @override
  String get bannerPinned => 'Pinned';

  @override
  String get bannerStart => 'Start';

  @override
  String get homeChannelCHAIRMAN => 'Chairman';

  @override
  String get homeChannelMANAGING_DIRECTOR => 'Managing Director';

  @override
  String get homeChannelHR => 'Human Resources';

  @override
  String get homeChannelADMINISTRATION => 'Administration';

  @override
  String get homeChannelCOMPLIANCE => 'Compliance';

  @override
  String get homeChannelIT => 'IT';

  @override
  String get promoCarTitle => 'Need a car for official work?';

  @override
  String get promoCarBody =>
      'Request a pool car — your head of department approves in one tap.';

  @override
  String get promoIssueTitle => 'See something unsafe or broken?';

  @override
  String get promoIssueBody =>
      'Snap a photo and report it. The admin team is told at once.';

  @override
  String get promoVisitorTitle => 'Expecting a guest?';

  @override
  String get promoVisitorBody =>
      'Send them a gate pass before they arrive — no waiting at the gate.';

  @override
  String get myRequests => 'My requests';

  @override
  String get myTours => 'My tour requests';

  @override
  String get myCars => 'My pool car requests';

  @override
  String get myVisitors => 'My visitors';

  @override
  String get myApprovals => 'Waiting for my approval';

  @override
  String get incModuleTitle => 'Incident & Facility Issues';

  @override
  String get incReport => 'Report an incident';

  @override
  String get incReportHint =>
      'Safety, facility, security or IT problem? Snap a photo — the right team is told at once.';

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
  String incStepOf(int step, int total) {
    return 'Step $step of $total';
  }

  @override
  String get incChooseGroup => 'What kind of problem is it?';

  @override
  String get incChooseGroupHint =>
      'Pick one of the four categories. You choose the exact problem next.';

  @override
  String get incChooseCategory => 'Which one fits best?';

  @override
  String get incChangeGroup => 'Change';

  @override
  String get incTitleLabel => 'Title';

  @override
  String get incTitleHint => 'e.g. Strong smell of gas near the boiler room';

  @override
  String get incDescriptionLabel => 'What did you see? (optional)';

  @override
  String get incPhotos => 'Photos';

  @override
  String get incPhotosHint =>
      'Add up to 3 photos. A clear photo helps the team act faster.';

  @override
  String incPhotoCount(int count, int max) {
    return '$count of $max added';
  }

  @override
  String incPhotoPreview(int number) {
    return 'Photo $number';
  }

  @override
  String get incTakePhoto => 'Take photo';

  @override
  String get incChoosePhoto => 'Gallery';

  @override
  String get incRemovePhoto => 'Remove photo';

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
  String get incSeverity => 'Severity';

  @override
  String get incPrivacy => 'Privacy';

  @override
  String get incConfidential => 'Confidential report';

  @override
  String get incConfidentialHint =>
      'Goes to Head Office only — never to your own office\'s admins — and your name is hidden from everyone handling it.';

  @override
  String get incConfidentialForced =>
      'Misconduct reports are always confidential and go to Head Office only.';

  @override
  String get incAnonymous => 'Report anonymously';

  @override
  String get incAnonymousHint =>
      'Your office\'s admins still handle it, but won\'t see your name. It is kept only so you can follow the stages.';

  @override
  String get incSubmit => 'Submit report';

  @override
  String incSubmitted(Object ref) {
    return 'Report $ref sent. The team has been notified.';
  }

  @override
  String get incTitleRequired => 'Give a short title (at least 3 characters)';

  @override
  String get incCategoryRequired => 'Choose what kind of problem it is';

  @override
  String get incOfflineNotice =>
      'You\'re offline. Reports with photos need a connection — try again when you\'re back online.';

  @override
  String get incGrpSAFETY_INDUSTRIAL => 'Safety & Industrial';

  @override
  String get incGrpADMIN_FACILITY => 'Admin & Facility';

  @override
  String get incGrpSECURITY => 'Security';

  @override
  String get incGrpIT_TECHNICAL => 'IT / Technical';

  @override
  String get incGrpHintSAFETY_INDUSTRIAL =>
      'Fire, gas, chemicals, injuries, electrical, machinery, PPE';

  @override
  String get incGrpHintADMIN_FACILITY =>
      'Building, cleaning, cafeteria, washrooms, water, AC, furniture';

  @override
  String get incGrpHintSECURITY =>
      'Access, theft, CCTV, gates and locks, misconduct';

  @override
  String get incGrpHintIT_TECHNICAL =>
      'Network, computers, software, phones, power and UPS';

  @override
  String get incCatFIRE_HAZARD => 'Fire hazard';

  @override
  String get incCatGAS_LEAK => 'Gas leak';

  @override
  String get incCatCHEMICAL_SPILL => 'Chemical spill';

  @override
  String get incCatINJURY_NEAR_MISS => 'Injury or near miss';

  @override
  String get incCatELECTRICAL_HAZARD => 'Electrical hazard';

  @override
  String get incCatMACHINERY_FAULT => 'Machinery fault';

  @override
  String get incCatPPE_VIOLATION => 'PPE violation';

  @override
  String get incCatSAFETY_HAZARD => 'Other safety hazard';

  @override
  String get incCatBUILDING_DAMAGE => 'Building damage';

  @override
  String get incCatCLEANLINESS => 'Cleanliness';

  @override
  String get incCatCAFETERIA_HYGIENE => 'Cafeteria hygiene';

  @override
  String get incCatWASHROOM => 'Washroom';

  @override
  String get incCatWATER_SUPPLY => 'Water supply';

  @override
  String get incCatAC_VENTILATION => 'AC & ventilation';

  @override
  String get incCatFURNITURE_FIXTURES => 'Furniture & fixtures';

  @override
  String get incCatPEST_CONTROL => 'Pest control';

  @override
  String get incCatOTHER => 'Other facility issue';

  @override
  String get incCatUNAUTHORISED_ACCESS => 'Unauthorised access';

  @override
  String get incCatTHEFT_LOSS => 'Theft or loss';

  @override
  String get incCatCCTV_FAULT => 'CCTV fault';

  @override
  String get incCatGATE_LOCK => 'Gate or lock';

  @override
  String get incCatMISCONDUCT => 'Misconduct';

  @override
  String get incCatNETWORK_DOWN => 'Network down';

  @override
  String get incCatCOMPUTER_PRINTER => 'Computer or printer';

  @override
  String get incCatSOFTWARE_ACCESS => 'Software or access';

  @override
  String get incCatTELEPHONE => 'Telephone / PABX';

  @override
  String get incCatPOWER_UPS => 'Power or UPS';

  @override
  String get incCatHintFIRE_HAZARD =>
      'Smoke, sparks, blocked fire exits, missing or expired extinguishers';

  @override
  String get incCatHintGAS_LEAK =>
      'Smell of gas, hissing pipes or cylinders, faulty gas lines';

  @override
  String get incCatHintCHEMICAL_SPILL =>
      'Spilled or leaking chemicals, dyes, oil or fuel';

  @override
  String get incCatHintINJURY_NEAR_MISS =>
      'Someone was hurt at work, or very nearly was';

  @override
  String get incCatHintELECTRICAL_HAZARD =>
      'Exposed wiring, sparking sockets, overloaded or open switchboards';

  @override
  String get incCatHintMACHINERY_FAULT =>
      'Unsafe or broken machines, missing guards, unusual noise or smoke';

  @override
  String get incCatHintPPE_VIOLATION =>
      'Helmets, gloves, masks or harnesses not worn or not available';

  @override
  String get incCatHintSAFETY_HAZARD =>
      'Wet floors, trip hazards, blocked walkways, unsafe heights';

  @override
  String get incCatHintBUILDING_DAMAGE =>
      'Cracked or fallen walls and ceilings, leaks, broken doors or windows';

  @override
  String get incCatHintCLEANLINESS =>
      'Dirty floors, corridors and stairs, overflowing bins';

  @override
  String get incCatHintCAFETERIA_HYGIENE =>
      'Unclean kitchen or serving area, food safety';

  @override
  String get incCatHintWASHROOM =>
      'Unclean washroom, no soap or tissue, blocked drains';

  @override
  String get incCatHintWATER_SUPPLY =>
      'No water, low pressure, dirty or unsafe drinking water';

  @override
  String get incCatHintAC_VENTILATION =>
      'AC not cooling or leaking, fans not working, stuffy rooms';

  @override
  String get incCatHintFURNITURE_FIXTURES =>
      'Broken chairs, desks or cabinets, lights or fittings';

  @override
  String get incCatHintPEST_CONTROL =>
      'Rats, cockroaches, mosquitoes or termites';

  @override
  String get incCatHintOTHER => 'Anything else the admin team should look at';

  @override
  String get incCatHintUNAUTHORISED_ACCESS =>
      'Unknown person inside, tailgating, misuse of ID cards';

  @override
  String get incCatHintTHEFT_LOSS =>
      'Missing equipment, stock, documents or belongings';

  @override
  String get incCatHintCCTV_FAULT =>
      'Camera offline, blind spot, recorder not working';

  @override
  String get incCatHintGATE_LOCK =>
      'Unattended gate, broken lock, faulty barrier or access door';

  @override
  String get incCatHintMISCONDUCT =>
      'Harassment, bribery, fraud or other wrongdoing — always confidential';

  @override
  String get incCatHintNETWORK_DOWN =>
      'No internet, Wi-Fi or LAN outage, very slow connection';

  @override
  String get incCatHintCOMPUTER_PRINTER =>
      'PC, laptop, printer or scanner not working';

  @override
  String get incCatHintSOFTWARE_ACCESS =>
      'ERP, email or app errors, password or permission problems';

  @override
  String get incCatHintTELEPHONE => 'Desk phone, PABX or intercom not working';

  @override
  String get incCatHintPOWER_UPS =>
      'Power cut, UPS or generator failure, voltage problems';

  @override
  String get incSevCRITICAL => 'Critical';

  @override
  String get incSevHIGH => 'High';

  @override
  String get incSevMEDIUM => 'Medium';

  @override
  String get incSevLOW => 'Low';

  @override
  String get incSevHintCRITICAL =>
      'Danger to people, or work has stopped — act now';

  @override
  String get incSevHintHIGH => 'Serious; needs action today';

  @override
  String get incSevHintMEDIUM => 'Needs fixing soon';

  @override
  String get incSevHintLOW => 'Minor; fix when convenient';

  @override
  String get incStatusREPORTED => 'Reported';

  @override
  String get incStatusACKNOWLEDGED => 'Acknowledged';

  @override
  String get incStatusUNDER_INVESTIGATION => 'Under Investigation';

  @override
  String get incStatusCLOSED => 'Closed';

  @override
  String get incProgress => 'Progress';

  @override
  String get incStageSkipped => 'Skipped';

  @override
  String get incStageNow => 'Now';

  @override
  String get incWaitingForAdmin => 'Waiting for the team to acknowledge it.';

  @override
  String get incResRESOLVED => 'Resolved';

  @override
  String get incResNO_ACTION_NEEDED => 'No action needed';

  @override
  String get incResDUPLICATE => 'Duplicate';

  @override
  String get incResREFERRED => 'Referred';

  @override
  String get incResHintRESOLVED => 'The problem has been fixed.';

  @override
  String get incResHintNO_ACTION_NEEDED =>
      'The team checked and nothing needs to be done.';

  @override
  String get incResHintDUPLICATE =>
      'It was already reported and is being handled under that report.';

  @override
  String get incResHintREFERRED =>
      'It has been passed to another authority or department.';

  @override
  String get incResolution => 'Resolution';

  @override
  String incClosedAs(Object resolution) {
    return 'Closed as $resolution';
  }

  @override
  String get incFilterAll => 'All';

  @override
  String get incFilterOpen => 'Open';

  @override
  String get incNoReports => 'No reports yet';

  @override
  String get incNoReportsHint =>
      'When you report a problem, you can follow every stage here.';

  @override
  String get incNoReportsFilter => 'No reports at this stage.';

  @override
  String get incAdminUpdate => 'Update from the team';

  @override
  String get incReportedBy => 'Reported by';

  @override
  String get incReportedOn => 'Reported';

  @override
  String get incAnonymousBadge => 'Anonymous';

  @override
  String get incConfidentialBadge => 'Confidential';

  @override
  String get incConfidentialDetail =>
      'Confidential: handled by Head Office only. Your name is hidden from everyone handling it.';

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
  String get incEvAcknowledged => 'Acknowledged';

  @override
  String get incEvInvestigation => 'Investigation started';

  @override
  String incEvClosed(Object resolution) {
    return 'Closed — $resolution';
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
  String get licTitle => 'Licences';

  @override
  String get licRegister => 'Licence register';

  @override
  String get licReadOnlyNote =>
      'Changes are made by the compliance team in the ABG ONE portal.';

  @override
  String get licFilterAll => 'All';

  @override
  String get licFilterEXPIRING => 'Expiring';

  @override
  String get licFilterDUE_SOON => 'Renewal due';

  @override
  String get licFilterEXPIRED => 'Expired';

  @override
  String get licFilterRENEWAL_IN_PROGRESS => 'Renewal in progress';

  @override
  String get licFilterVALID => 'Valid';

  @override
  String get licStateVALID => 'Valid';

  @override
  String get licStateDUE_SOON => 'Renewal due';

  @override
  String get licStateEXPIRING => 'Expiring';

  @override
  String get licStateEXPIRED => 'Expired';

  @override
  String get licRetired => 'Retired';

  @override
  String get licRetiredNotice =>
      'Retired from the register — no alerts are sent.';

  @override
  String licDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days left',
      one: '1 day left',
    );
    return '$_temp0';
  }

  @override
  String get licExpiresToday => 'Expires today';

  @override
  String licExpiredAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Expired $count days ago',
      one: 'Expired 1 day ago',
    );
    return '$_temp0';
  }

  @override
  String licCaptionLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'days left',
      one: 'day left',
    );
    return '$_temp0';
  }

  @override
  String licCaptionOverdue(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'days overdue',
      one: 'day overdue',
    );
    return '$_temp0';
  }

  @override
  String get licCaptionToday => 'expiry day';

  @override
  String get licToday => 'Today';

  @override
  String get licWithin30 => '≤ 30 days';

  @override
  String get licNextToExpire => 'Next to expire';

  @override
  String get licNoLicences => 'No licences here';

  @override
  String get licNoLicencesHint =>
      'Try another filter. Licences for the offices you look after appear here.';

  @override
  String get licRenewal => 'Renewal';

  @override
  String get licRenewalProgress => 'Renewal progress';

  @override
  String get licStageNOT_STARTED => 'Not started';

  @override
  String get licStageDOCUMENTS_PREPARED => 'Documents prepared';

  @override
  String get licStageAPPLICATION_SUBMITTED => 'Application submitted';

  @override
  String get licStageINSPECTION_SCHEDULED => 'Inspection scheduled';

  @override
  String get licStageFEE_PAID => 'Fee paid';

  @override
  String get licStageRENEWED => 'Renewed';

  @override
  String licStartedOn(Object date) {
    return 'Started $date';
  }

  @override
  String licNotStartedHint(Object date) {
    return 'Renewal has not started yet. The renewal window opens on $date.';
  }

  @override
  String licWindowOpenHint(Object date) {
    return 'Renewal has not started yet. The renewal window opened on $date.';
  }

  @override
  String get licNextStep => 'Next';

  @override
  String get licCatTRADE => 'Trade licence';

  @override
  String get licCatFACTORY => 'Factory licence';

  @override
  String get licCatENVIRONMENT => 'Environmental clearance';

  @override
  String get licCatFIRE_SAFETY => 'Fire safety';

  @override
  String get licCatENERGY_REGULATORY => 'Energy regulatory (BERC)';

  @override
  String get licCatEXPLOSIVES => 'Explosives / LPG storage';

  @override
  String get licCatBOILER => 'Boiler certificate';

  @override
  String get licCatIMPORT_EXPORT => 'Import / export (IRC / ERC)';

  @override
  String get licCatSTANDARDS => 'Standards (BSTI)';

  @override
  String get licCatOTHER => 'Other';

  @override
  String get licDetails => 'Details';

  @override
  String get licNumber => 'Licence number';

  @override
  String get licKind => 'Kind of licence';

  @override
  String get licAuthority => 'Issuing authority';

  @override
  String get licOffice => 'Office';

  @override
  String get licOwner => 'Owner';

  @override
  String get licNoOwner => 'Not set — alerts go to the compliance team';

  @override
  String get licIssuedOn => 'Issued on';

  @override
  String get licExpiresOn => 'Expires on';

  @override
  String get licExpiredOn => 'Expired on';

  @override
  String get licWindow => 'Renewal window';

  @override
  String licWindowValue(int days) {
    return '$days days before expiry';
  }

  @override
  String get licFee => 'Renewal fee';

  @override
  String licFeeValue(Object amount) {
    return 'Tk $amount';
  }

  @override
  String get licNotes => 'Notes';

  @override
  String licNextAlert(Object date) {
    return 'Next alert on $date';
  }

  @override
  String get licAllAlertsSent =>
      'All expiry alerts for this date have gone out.';

  @override
  String get licScan => 'Scanned copy';

  @override
  String get licViewScan => 'View scanned copy';

  @override
  String get licNoScan => 'No scanned copy yet.';

  @override
  String get licPdf => 'PDF document';

  @override
  String get licImage => 'Image';

  @override
  String get licOpenFailed =>
      'Couldn\'t open the document. Check your connection and try again.';

  @override
  String get licHistory => 'History';

  @override
  String get licEvCreated => 'Added to the register';

  @override
  String get licEvDetails => 'Details changed';

  @override
  String get licEvRetired => 'Retired from the register';

  @override
  String get licEvRestored => 'Back in use';

  @override
  String licEvStage(Object stage) {
    return 'Renewal moved to $stage';
  }

  @override
  String licEvStageBack(Object stage) {
    return 'Renewal moved back to $stage';
  }

  @override
  String licEvRenewed(Object date) {
    return 'Renewed until $date';
  }

  @override
  String get licEvDocument => 'Scanned copy uploaded';

  @override
  String licEvAlert(int days) {
    return 'Expiry alert: $days days before';
  }

  @override
  String get licEvAlertDay => 'Expiry alert: expiry day';

  @override
  String get licEvNote => 'Note';

  @override
  String licEvNotified(Object names) {
    return 'Sent to $names';
  }

  @override
  String get nbTitle => 'Notice board';

  @override
  String get nbSubtitle =>
      'Official notices from the Chairman, the MD, HR and administration';

  @override
  String get nbFilterAll => 'All';

  @override
  String get nbFilterUnread => 'Unread';

  @override
  String get nbChannelCHAIRMAN => 'Chairman';

  @override
  String get nbChannelMANAGING_DIRECTOR => 'Managing Director';

  @override
  String get nbChannelHR => 'Human Resources';

  @override
  String get nbChannelADMINISTRATION => 'Administration';

  @override
  String get nbChannelCOMPLIANCE => 'Compliance';

  @override
  String get nbChannelIT => 'IT';

  @override
  String get nbCatGENERAL => 'General';

  @override
  String get nbCatCIRCULAR => 'Circular';

  @override
  String get nbCatPOLICY => 'Policy';

  @override
  String get nbCatHR => 'HR';

  @override
  String get nbCatSAFETY => 'Safety';

  @override
  String get nbCatEVENT => 'Event';

  @override
  String get nbCatHOLIDAY => 'Holiday';

  @override
  String get nbUrgent => 'Urgent';

  @override
  String get nbPinned => 'Pinned';

  @override
  String get nbNew => 'New';

  @override
  String get nbAcknowledged => 'Acknowledged';

  @override
  String get nbAckNeeded => 'Please acknowledge';

  @override
  String get nbHasPdf => 'PDF attached';

  @override
  String nbUnreadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unread notices',
      one: '1 unread notice',
      zero: 'Everything read',
    );
    return '$_temp0';
  }

  @override
  String nbToAckCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count waiting for your acknowledgement',
      one: '1 waiting for your acknowledgement',
    );
    return '$_temp0';
  }

  @override
  String get nbEmpty => 'No notices here';

  @override
  String get nbEmptyHint =>
      'Notices addressed to you appear here, urgent ones first.';

  @override
  String get nbEmptyUnreadHint => 'You have read every notice on the board.';

  @override
  String get nbShowAll => 'Show all notices';

  @override
  String nbFromOffice(Object channel) {
    return 'From the office of the $channel';
  }

  @override
  String get nbUrgentBanner => 'Urgent notice — please read it now';

  @override
  String get nbPublished => 'Published';

  @override
  String get nbAudience => 'Addressed to';

  @override
  String get nbAudienceAll => 'Everyone in the group';

  @override
  String get nbOnBoardUntil => 'On the board until';

  @override
  String get nbExpired => 'This notice has expired.';

  @override
  String get nbArchived => 'This notice has been taken off the board.';

  @override
  String get nbSignedBy => 'Signed by';

  @override
  String get nbAttachment => 'Attached document';

  @override
  String get nbOpenPdf => 'Open the PDF';

  @override
  String get nbPdfHint => 'Opens in your phone\'s PDF viewer';

  @override
  String get nbPdfFailed =>
      'The PDF could not be opened. Check your connection and try again.';

  @override
  String get nbAckPrompt =>
      'The sender asks you to confirm that you have read and understood this notice.';

  @override
  String get nbAckButton => 'I have read and understood';

  @override
  String get nbAckTitle => 'Acknowledge this notice';

  @override
  String get nbAckBody =>
      'You confirm that you have read and understood this notice. Your name and the time are recorded for the sender.';

  @override
  String get nbAckConfirm => 'Confirm';

  @override
  String get nbAckDone => 'Thank you — your acknowledgement is recorded.';

  @override
  String nbAckedOn(Object time) {
    return 'You acknowledged this notice · $time';
  }

  @override
  String get nbAckExpired =>
      'This notice has expired and can no longer be acknowledged.';

  @override
  String get nbNoAckNeeded =>
      'For your information — no acknowledgement needed.';

  @override
  String get nbAuthorNote =>
      'You published this notice. See who has read it in the admin portal.';

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
