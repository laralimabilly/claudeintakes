import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

interface PhoneInputProps {
  onSubmit: (phoneNumber: string, countryCode: string) => void;
  isLoading?: boolean;
  variant?: "light" | "dark";
}

const countryCodes = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
];

export const PhoneInput = ({ onSubmit, isLoading = false, variant = "light" }: PhoneInputProps) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim()) {
      onSubmit(phoneNumber, countryCode);
    }
  };

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xl mx-auto px-2 sm:px-0">
      <div className="relative flex flex-row items-center w-full overflow-hidden bg-transparent border-b border-silver/50">
        <div className={`flex items-center border-r ${isDark ? "border-silver/50" : "border-silver/50"}`}>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 px-3 sm:px-4 py-3 gap-1 sm:gap-2 min-h-[52px] text-base text-silver [&>span]:line-clamp-none">
              <SelectValue>
                <span className="flex items-center gap-1 sm:gap-2">
                  <span className="text-lg">{countryCodes.find((c) => c.code === countryCode)?.flag}</span>
                  <span className="text-sm sm:text-base text-silver">{countryCode}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-charcoal z-[100] border border-charcoal shadow-lg">
              {countryCodes.map((country) => (
                <SelectItem key={country.code} value={country.code} className="min-h-[44px]">
                  <span className="flex items-center gap-2">
                    <span className="text-lg text-silver">{country.flag}</span>
                    <span className="text-base text-silver">{country.code}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          type="tel"
          inputMode="numeric"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
          maxLength={15}
          className="flex-1 bg-transparent px-2 sm:px-4 py-3 text-base text-silver text-center placeholder:text-center placeholder:text-muted-foreground focus:outline-none min-h-[52px]"
          required
          autoComplete="tel"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className={`w-full mt-2 font-medium px-8 py-4 sm:py-6 min-h-[56px] transition-all text-base sm:text-lg ${
          isDark ? "bg-ochre hover:bg-ochre/80 text-charcoal" : "bg-charcoal hover:bg-charcoal/90 text-white"
        }`}
      >
        <Phone className="w-5 h-5 mr-2" strokeWidth={2} />
        {isLoading ? "Calling..." : "Call Me Now"}
      </Button>
    </form>
  );
};
