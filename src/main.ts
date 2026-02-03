import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";

import { setAssetPath } from "ionicons";

if (typeof document !== "undefined") {
  setAssetPath(document.baseURI);
}
bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
