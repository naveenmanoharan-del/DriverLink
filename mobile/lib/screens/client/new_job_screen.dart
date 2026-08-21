import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/app_button.dart';
import 'job_detail_screen.dart';

const Map<String, String> _groupLabels = {
  'physical_labour': 'Physical labour',
  'driver': 'Drivers',
  'artisan': 'Artisans',
  'office_staff': 'Office staff',
  'other': 'Other',
};

class NewJobScreen extends StatefulWidget {
  const NewJobScreen({super.key});

  @override
  State<NewJobScreen> createState() => _NewJobScreenState();
}

class _NewJobScreenState extends State<NewJobScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiClient();

  final _title = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  final _workersRequired = TextEditingController(text: '1');
  final _offeredRate = TextEditingController();
  String _rateUnit = 'day';
  String? _categoryId;
  DateTime? _startsAt;

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

  Future<void> _pickStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
    );
    if (time == null) return;
    setState(
      () =>
          _startsAt = DateTime(
            date.year,
            date.month,
            date.day,
            time.hour,
            time.minute,
          ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() ||
        _categoryId == null ||
        _startsAt == null) {
      setState(() {
        _error =
            _categoryId == null
                ? 'Please select a category'
                : (_startsAt == null
                    ? 'Please select a start date/time'
                    : null);
      });
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthState>();
      final job =
          await _api.post(
                '/v1/jobs',
                token: auth.accessToken,
                body: {
                  'categoryId': _categoryId,
                  'title': _title.text.trim(),
                  if (_description.text.trim().isNotEmpty)
                    'description': _description.text.trim(),
                  'location': _location.text.trim(),
                  'workersRequired': int.tryParse(_workersRequired.text) ?? 1,
                  'offeredRate': _offeredRate.text.trim(),
                  'rateUnit': _rateUnit,
                  'startsAt': _startsAt!.toUtc().toIso8601String(),
                },
              )
              as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => JobDetailScreen(jobId: job['id'] as String),
        ),
      );
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
      appBar: AppBar(title: const Text('Post a job')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator:
                      (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                _loadingCategories
                    ? const Center(child: CircularProgressIndicator())
                    : DropdownButtonFormField<String>(
                      value: _categoryId,
                      decoration: const InputDecoration(labelText: 'Category'),
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
                TextFormField(
                  controller: _location,
                  decoration: const InputDecoration(labelText: 'Location'),
                  validator:
                      (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _description,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _workersRequired,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Workers required',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: AppColors.slateLight),
                          ),
                          foregroundColor: AppColors.ink,
                        ),
                        onPressed: _pickStartDate,
                        child: Text(
                          _startsAt == null
                              ? 'Starts at'
                              : '${_startsAt!.day}/${_startsAt!.month}/${_startsAt!.year} ${_startsAt!.hour}:${_startsAt!.minute.toString().padLeft(2, '0')}',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _offeredRate,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Offered rate (INR)',
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
                  label: 'Post job',
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
