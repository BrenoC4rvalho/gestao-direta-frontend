import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PASSWORD_POLICY = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
} as const;

export interface PasswordRequirement {
  key: keyof typeof PASSWORD_POLICY;
  label: string;
  met: boolean;
}

export function passwordRequirements(value: unknown): PasswordRequirement[] {
  const password = `${value ?? ''}`;

  return [
    { key: 'minLength', label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
    { key: 'uppercase', label: 'Uma letra maiúscula', met: PASSWORD_POLICY.uppercase.test(password) },
    { key: 'lowercase', label: 'Uma letra minúscula', met: PASSWORD_POLICY.lowercase.test(password) },
    { key: 'number', label: 'Um número', met: PASSWORD_POLICY.number.test(password) },
    { key: 'special', label: 'Um caractere especial', met: PASSWORD_POLICY.special.test(password) },
  ];
}

export function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  return passwordRequirements(control.value).every((requirement) => requirement.met)
    ? null
    : { passwordPolicy: true };
}
