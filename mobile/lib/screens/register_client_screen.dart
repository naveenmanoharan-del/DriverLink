import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/app_button.dart';

class RegisterClientScreen extends StatefulWidget {
  const RegisterClientScreen({super.key});

  @override
  State<RegisterClientScreen> createState() => _RegisterClientScreenState();
}

class _RegisterClientScreenState extends State<RegisterClientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _companyName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _city = TextEditingController();
  String _clientType = 'individual';
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthState>();
      await auth.registerClient({
        'phone': _phone.text.trim(),
        'password': _password.text,
        'name': _name.text.trim(),
        if (_companyName.text.trim().isNotEmpty)
          'companyName': _companyName.text.trim(),
        'clientType': _clientType,
        if (_city.text.trim().isNotEmpty) 'city': _city.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil('/client', (route) => false);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register as a client')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Your name'),
                  validator:
                      (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _clientType,
                  decoration: const InputDecoration(labelText: 'Account type'),
                  items: const [
                    DropdownMenuItem(
                      value: 'individual',
                      child: Text('Individual / household'),
                    ),
                    DropdownMenuItem(value: 'company', child: Text('Company')),
                  ],
                  onChanged:
                      (v) => setState(() => _clientType = v ?? 'individual'),
                ),
                if (_clientType == 'company') ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _companyName,
                    decoration: const InputDecoration(
                      labelText: 'Company name',
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    hintText: '+919000000000',
                  ),
                  validator:
                      (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                  validator:
                      (v) =>
                          (v == null || v.length < 8)
                              ? 'Minimum 8 characters'
                              : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _city,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: AppColors.warn)),
                ],
                const SizedBox(height: 24),
                AppButton(
                  label: 'Create client account',
                  loading: _submitting,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
