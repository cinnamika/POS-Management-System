======================================
  POS MODULE - M2 SETUP GUIDE
======================================

--- BAGO I-RUN (isang beses lang) ---

1. I-install ang Node.js (https://nodejs.org)
2. I-install ang MySQL, root password = jane2005
3. I-download ang ngrok.exe (https://ngrok.com/download)
   - I-extract at ilagay sa ngrok_setup folder
4. I-setup ang database at dependencies:
     cd POS-Module
     npm install
     mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pos_db;"
     mysql -u root -p pos_db < src/backend/schema.sql
     (type password: jane2005)
5. I-configure ang ngrok (isang beses lang):
     cd ngrok_setup
     ngrok config add-authtoken 3FhMZGF21LjnAOG9AKNWYV88hfE_2vFfU1s7dAStgHT2DGG9t
6. I-copy src/backend/.env.example -> src/backend/.env
   - Buksan sa Notepad at ilagay ang tamang email credentials
   - Ang INVENTORY_API_URL ay naka-set na sa ngrok URL ni Jane (M1)
     Kung magbago URL, palitan dito.

--- SA PRESENTATION DAY ---

Bukas ng 3 terminals (CMD):

Terminal 1 - Backend:
  cd POS-Module
  npm run dev:server

Terminal 2 - Ngrok:
  cd POS-Module\ngrok_setup
  ngrok.exe http 8002
  (kopyahin ang URL na lalabas, i-share kay Jane at Classmate B)

Terminal 3 - Frontend:
  cd POS-Module
  npm run dev

--- SA BROWSER ---
Bukas: http://localhost:5174

--- KUNG MAY ERROR ---
Tiyaking:
  - MySQL tumatakbo (services.msc -> MySQL80 -> Start)
  - Password sa .env tugma sa MySQL password
  - inventoryClient.js ay may tamang URL ni Jane (M1)
