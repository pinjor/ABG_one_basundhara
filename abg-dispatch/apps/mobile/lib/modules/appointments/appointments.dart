/// Request for Appointment: ask an executive or a head of department for a
/// meeting; they (or the executive office) confirm, propose or decline.
///
/// The router imports these screens from this file; the code lives in the
/// other files of this folder.
library;

export 'appointment_api.dart' show AppointmentsApi;
export 'appointment_detail_screen.dart' show AppointmentDetailScreen;
export 'appointment_form_screen.dart' show AppointmentFormScreen;
export 'appointment_models.dart';
export 'appointment_widgets.dart'
    show
        AppointmentCard,
        AppointmentStatusChip,
        appointmentStatusLabel,
        meetingWhen;
export 'appointments_screen.dart' show AppointmentsScreen;
