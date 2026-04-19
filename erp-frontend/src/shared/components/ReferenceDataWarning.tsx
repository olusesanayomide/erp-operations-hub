import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

type ReferenceDataWarningProps = {
  message?: string;
};

export function ReferenceDataWarning({
  message = "Some reference data could not be loaded.",
}: ReferenceDataWarningProps) {
  return (
    <Alert className="mb-4 border-amber-300/60 bg-amber-50 text-amber-950 [&>svg]:text-amber-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Reference data warning</AlertTitle>
      <AlertDescription className="text-amber-900">{message}</AlertDescription>
    </Alert>
  );
}
