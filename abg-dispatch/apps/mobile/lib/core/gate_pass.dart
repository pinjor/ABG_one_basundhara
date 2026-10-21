/// Gate passes printed or shown as QR codes: visitors (`…/g/v/<token>`) and
/// pool cars (`…/g/c/<token>`). Mirrors `extractGatePass` in packages/shared.
enum GatePassKind { visitor, vehicle }

class GatePass {
  const GatePass(this.kind, this.token);
  final GatePassKind kind;
  final String token;

  /// Where the app shows this pass for verification at the gate.
  String get route => kind == GatePassKind.visitor
      ? '/visitors/pass/$token'
      : '/pool-car/pass/$token';
}

final _pattern = RegExp(r'/g/([vc])/([A-Za-z0-9_-]{16,128})/?$');

GatePass? extractGatePass(String scanned) {
  final m = _pattern.firstMatch(scanned.trim());
  if (m == null) return null;
  return GatePass(
    m.group(1) == 'v' ? GatePassKind.visitor : GatePassKind.vehicle,
    m.group(2)!,
  );
}
