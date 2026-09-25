import { COUNTRY_CODES, PHONE_DIGITS, joinPhone, splitPhone } from '@/lib/phone';
import { inputClass } from './ui';

/**
 * Country-code picker plus a number box that takes exactly 10 digits. `value` and
 * `onChange` use the combined form ("+919000000000") the API expects.
 */
export function PhoneField({
  value,
  onChange,
  required,
  className = inputClass,
}: {
  value: string;
  onChange: (phone: string) => void;
  required?: boolean;
  className?: string;
}) {
  const { code, number } = splitPhone(value);
  return (
    <div className="flex gap-2">
      <div className="w-32 shrink-0">
        <select
          aria-label="Country code"
          className={className}
          value={code}
          onChange={(e) => onChange(joinPhone(e.target.value, number))}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1">
        <input
          aria-label="Phone number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          minLength={PHONE_DIGITS}
          maxLength={PHONE_DIGITS}
          pattern={`[0-9]{${PHONE_DIGITS}}`}
          title={`Enter a ${PHONE_DIGITS}-digit phone number`}
          placeholder="9000000000"
          className={className}
          value={number}
          onChange={(e) => onChange(joinPhone(code, e.target.value))}
        />
      </div>
    </div>
  );
}
