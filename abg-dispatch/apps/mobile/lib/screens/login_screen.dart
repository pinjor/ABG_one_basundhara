import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/session.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _totp = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  bool _needsTotp = false;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _totp.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<SessionController>().login(
        _identifier.text,
        _password.text,
        totp: _needsTotp ? _totp.text : null,
      );
    } on MfaRequired {
      setState(() => _needsTotp = true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final media = MediaQuery.of(context);
    return Scaffold(
      backgroundColor: AbgColors.midnight,
      resizeToAvoidBottomInset: true,
      body: HeroBackground(
        child: LayoutBuilder(
          builder: (context, viewport) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: viewport.maxHeight),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    SizedBox(height: media.padding.top + 48),
                    const AbgLogo(width: 186),
                    const SizedBox(height: 22),
                    const DispatchWordmark(size: 13),
                    const SizedBox(height: 10),
                    Text(
                      l.tagline,
                      style: AbgText.small.copyWith(
                        color: AbgColors.platinumDeep,
                      ),
                    ),
                    const SizedBox(height: 40),
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        padding: EdgeInsets.fromLTRB(
                          24,
                          28,
                          24,
                          24 + media.padding.bottom,
                        ),
                        decoration: const BoxDecoration(
                          color: AbgColors.surface,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(AbgRadii.sheet),
                          ),
                        ),
                        child: Form(
                          key: _form,
                          child: AutofillGroup(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(l.welcomeBack, style: AbgText.h1),
                                const SizedBox(height: 6),
                                Text(l.signInSubtitle, style: AbgText.small),
                                const SizedBox(height: 24),
                                TextFormField(
                                  controller: _identifier,
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  autofillHints: const [
                                    AutofillHints.username,
                                    AutofillHints.email,
                                  ],
                                  decoration: InputDecoration(
                                    labelText: l.identifierLabel,
                                    prefixIcon: const Icon(
                                      Icons.badge_outlined,
                                    ),
                                  ),
                                  validator: (v) =>
                                      (v == null || v.trim().isEmpty)
                                      ? l.required
                                      : null,
                                ),
                                const SizedBox(height: 14),
                                TextFormField(
                                  controller: _password,
                                  obscureText: _obscure,
                                  textInputAction: _needsTotp
                                      ? TextInputAction.next
                                      : TextInputAction.done,
                                  autofillHints: const [AutofillHints.password],
                                  onFieldSubmitted: (_) =>
                                      _needsTotp ? null : _submit(),
                                  decoration: InputDecoration(
                                    labelText: l.passwordLabel,
                                    prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                    ),
                                    suffixIcon: IconButton(
                                      tooltip: _obscure
                                          ? 'Show password'
                                          : 'Hide password',
                                      icon: Icon(
                                        _obscure
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                      ),
                                      onPressed: () =>
                                          setState(() => _obscure = !_obscure),
                                    ),
                                  ),
                                  validator: (v) => (v == null || v.isEmpty)
                                      ? l.required
                                      : null,
                                ),
                                if (_needsTotp) ...[
                                  const SizedBox(height: 14),
                                  TextFormField(
                                    controller: _totp,
                                    autofocus: true,
                                    keyboardType: TextInputType.number,
                                    maxLength: 6,
                                    autofillHints: const [
                                      AutofillHints.oneTimeCode,
                                    ],
                                    onFieldSubmitted: (_) => _submit(),
                                    decoration: InputDecoration(
                                      labelText: l.authenticatorLabel,
                                      prefixIcon: const Icon(
                                        Icons.shield_outlined,
                                      ),
                                      counterText: '',
                                    ),
                                    validator: (v) =>
                                        (v == null || v.length != 6)
                                        ? l.required
                                        : null,
                                  ),
                                ],
                                if (_error != null) ...[
                                  const SizedBox(height: 14),
                                  _ErrorBox(_error!),
                                ],
                                const SizedBox(height: 22),
                                FilledButton(
                                  onPressed: _busy ? null : _submit,
                                  child: _busy
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.4,
                                            color: Colors.white,
                                          ),
                                        )
                                      : Text(l.signIn),
                                ),
                                const SizedBox(height: 22),
                                Row(
                                  children: [
                                    const Expanded(child: Divider()),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      child: Text(
                                        l.carrierEntry,
                                        style: AbgText.caption,
                                      ),
                                    ),
                                    const Expanded(child: Divider()),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  onPressed: () => context.push('/guest-login'),
                                  icon: const Icon(
                                    Icons.local_shipping_outlined,
                                    size: 20,
                                  ),
                                  label: Text(l.carrierEntryAction),
                                ),
                                const SizedBox(height: 26),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.verified_user_outlined,
                                      size: 14,
                                      color: AbgColors.inkSubtle,
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        l.securedFooter,
                                        style: AbgText.caption,
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  l.orgName,
                                  style: AbgText.caption.copyWith(
                                    color: AbgColors.platinumDeep,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AbgColors.dangerSoft,
          borderRadius: BorderRadius.circular(AbgRadii.md),
          border: Border.all(color: AbgColors.danger.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AbgColors.danger,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: AbgText.small.copyWith(
                  color: AbgColors.danger,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
