"use client";

import { useState } from "react";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { INDIA_STATES, findCity, findState } from "@/lib/data/india-locations";

const OTHER = "__other__";

interface Location {
  state: string;
  city: string;
}

/**
 * State, then a city list for that state. Both end with "Other" for anything not listed,
 * which swaps in a text box. Values the lists don't know (e.g. saved before the dropdowns
 * existed) open straight in "Other" mode, so nothing a customer typed is lost.
 */
export function StateCityFields({
  state,
  city,
  onChange,
  errors,
}: Location & {
  onChange: (next: Location) => void;
  errors: { state?: string; city?: string };
}) {
  const [stateOther, setStateOther] = useState(() => state !== "" && !findState(state));
  const [cityOther, setCityOther] = useState(() => {
    const known = findState(state);
    return city !== "" && (!known || !findCity(known, city));
  });

  const selectedState = stateOther ? undefined : findState(state);

  function chooseState(value: string) {
    setCityOther(value === OTHER);
    if (value === OTHER) {
      setStateOther(true);
      onChange({ state: "", city: "" });
      return;
    }
    setStateOther(false);
    onChange({ state: value, city: "" });
  }

  function chooseCity(value: string) {
    setCityOther(value === OTHER);
    onChange({ state, city: value === OTHER ? "" : value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="state" required>
          State
        </Label>
        <Select
          id="state"
          required
          aria-invalid={!!errors.state}
          autoComplete="address-level1"
          value={stateOther ? OTHER : selectedState?.name ?? ""}
          onChange={(e) => chooseState(e.target.value)}
        >
          <option value="" disabled>
            Select state
          </option>
          {INDIA_STATES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.label}
            </option>
          ))}
          <option value={OTHER}>Other — type it in</option>
        </Select>
        {stateOther && (
          <Input
            autoFocus
            aria-label="Your state"
            required
            placeholder="Type your state"
            className="mt-2"
            value={state}
            onChange={(e) => onChange({ state: e.target.value, city })}
          />
        )}
        <FieldError>{errors.state}</FieldError>
      </div>

      <div>
        <Label htmlFor="city" required>
          City
        </Label>
        {stateOther ? (
          <Input
            id="city"
            required
            aria-invalid={!!errors.city}
            autoComplete="address-level2"
            placeholder="Type your city"
            value={city}
            onChange={(e) => onChange({ state, city: e.target.value })}
          />
        ) : (
          <>
            <Select
              id="city"
              required
              aria-invalid={!!errors.city}
              autoComplete="address-level2"
              disabled={!selectedState}
              value={cityOther ? OTHER : selectedState && findCity(selectedState, city)?.name || ""}
              onChange={(e) => chooseCity(e.target.value)}
            >
              <option value="" disabled>
                {selectedState ? "Select city" : "Select state first"}
              </option>
              {selectedState?.cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label}
                </option>
              ))}
              <option value={OTHER}>Other — type it in</option>
            </Select>
            {cityOther && (
              <Input
                autoFocus
                aria-label="Your city"
                required
                placeholder="Type your city"
                className="mt-2"
                value={city}
                onChange={(e) => onChange({ state, city: e.target.value })}
              />
            )}
          </>
        )}
        <FieldError>{errors.city}</FieldError>
      </div>
    </div>
  );
}
