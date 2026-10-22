/// Pool car requisitions: request, approve, ride, verify at the gate.
///
/// The router imports these screens from this file:
///   PoolCarScreen (/pool-car), CarRequestFormScreen (/pool-car/new),
///   CarRequisitionDetailScreen (/pool-car/:id),
///   VehiclePassScreen (/pool-car/pass/:token — the scanner opens `/g/c/<token>` codes here).
library;

export 'car_request_form_screen.dart' show CarRequestFormScreen;
export 'car_requisition_detail_screen.dart' show CarRequisitionDetailScreen;
export 'fleet_models.dart';
export 'fleet_widgets.dart';
export 'pool_car_screen.dart' show PoolCarScreen;
export 'vehicle_pass_screen.dart' show VehiclePassScreen, PassVerdict;
