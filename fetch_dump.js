import fs from 'fs';
import { get } from 'https';

const file = fs.createWriteStream("season2_dump.json");
const request = get("https://us-central1-oofs-manager.cloudfunctions.net/debugSeason2", function (response) {
    response.pipe(file);

    // after download completed close filestream
    file.on("finish", () => {
        file.close();
        console.log("Download Completed");
    });
});
