import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../services/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/app_button.dart';

const Map<String, String> _groupLabels = {
  'physical_labour': 'Physical labour',
  'driver': 'Drivers',
  'artisan': 'Artisans',
  'office_staff': 'Office staff',
  'other': 'Other',
};

class RegisterWorkerScreen extends StatefulWidget {
  const RegisterWorkerScreen({super.key});

  @override
  State<RegisterWorkerScreen> createState() => _RegisterWorkerScreenState();
}

class _RegisterWorkerScreenState extends State<RegisterWorkerScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiClient();

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _years = TextEditingController(text: '0');
  final _city = TextEditingController();
  final _minRate = TextEditingController();
  String _rateUnit = 'day';
  String? _categoryId;

  List<Category> _categories = [];
  bool _loadingCategories = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final result = await _api.get('/v1/categories') as List<dynamic>;
      setState(() {
        _categories =
            result
                .map((e) => Category.fromJson(e as Map<String, dynamic>))
                .toList();
        _loadingCategories = false;
      });
    } catch (_) {
      setState(() => _loadingCategories = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _categoryId == null) {
      if (_categoryId == null) {
        setState(() => _error = 'Please select a category');
      }
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthState>();
      await auth.registerWorker({
        'phone': _phone.text.trim(),
        'password': _password.text,
        'firstName': _firstName.text.trim(),
        if (_lastName.text.trim().isNotEmpty) 'lastName': _lastName.text.trim(),
        'categoryId': _categoryId,
        'yearsExperience': int.tryParse(_years.text) ?? 0,
        'minRate': _minRate.text.trim(),
        'rateUnit': _rateUnit,
        if (_city.text.trim().isNotEmpty) 'city': _city.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil('/worker', (route) => false);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<Category>>{};
    for (final c in _categories) {
      grouped.putIfAbsent(c.group, () => []).add(c);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Register as a worker')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _firstName,
                        decoration: const InputDecoration(
                          labelText: 'First name',
                        ),
                        validator:
                            (v) => (v == null || v.isEmpty) ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _lastName,
                        decoration: const InputDecoration(
                          labelText: 'Last name',
                        ),
                      ),
                    ),
                  ],
                ),
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
                _loadingCategories
                    ? const Center(child: CircularProgressIndicator())
                    : DropdownButtonFormField<String>(
                      value: _categoryId,
                      decoration: const InputDecoration(
                        labelText: 'Category / trade',
                      ),
                      items: [
                        for (final group in grouped.entries) ...[
                          DropdownMenuItem<String>(
                            enabled: false,
                            value: '__header_${group.key}',
                            child: Text(
                              _groupLabels[group.key] ?? group.key,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          ...group.value.map(
                            (c) => DropdownMenuItem<String>(
                              value: c.id,
                              child: Text('  ${c.name}'),
                            ),
                          ),
                        ],
                      ],
                      onChanged: (v) => setState(() => _categoryId = v),
                    ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _years,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Years of experience',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _city,
                        decoration: const InputDecoration(labelText: 'City'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _minRate,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Minimum rate (INR)',
                        ),
                        validator:
                            (v) => (v == null || v.isEmpty) ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _rateUnit,
                        decoration: const InputDecoration(labelText: 'Per'),
                        items: const [
                          DropdownMenuItem(value: 'hour', child: Text('Hour')),
                          DropdownMenuItem(value: 'day', child: Text('Day')),
                          DropdownMenuItem(value: 'job', child: Text('Job')),
                        ],
                        onChanged:
                            (v) => setState(() => _rateUnit = v ?? 'day'),
                      ),
                    ),
                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: AppColors.warn)),
                ],
                const SizedBox(height: 24),
                AppButton(
                  label: 'Create worker account',
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
