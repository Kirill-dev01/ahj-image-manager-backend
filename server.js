const Koa = require('koa');
const { koaBody } = require('koa-body');
const cors = require('@koa/cors');
const serve = require('koa-static');
const fs = require('fs');
const path = require('path');

const app = new Koa();

// Папка для физического хранения загруженных картинок
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Разрешаем запросы с других портов
app.use(cors());

// Раздаем статику (чтобы фронтенд мог открыть картинку по ссылке)
app.use(serve(publicDir));

// Настраиваем прием файлов (multipart: true обязателен для FormData)
app.use(koaBody({
    multipart: true,
    formidable: {
        uploadDir: publicDir,
        keepExtensions: true // Сохраняем расширения (.jpg, .png)
    }
}));

// Наша база данных (в памяти)
let filesList = [];

app.use(async (ctx) => {
    const { method, url } = ctx.request;

    // GET /files - Отдать список всех картинок
    if (method === 'GET' && url.startsWith('/files')) {
        ctx.response.body = filesList;
        return;
    }

    // POST /files - Принять новую картинку
    if (method === 'POST' && url.startsWith('/files')) {
        // koa-body автоматически сохранил файл в папку public
        const file = ctx.request.files.file; // 'file' - это имя поля, которое мы зададим во фронтенде

        if (file) {
            const newFile = {
                id: Math.random().toString(36).substring(2, 9),
                filename: file.originalFilename,
                path: path.basename(file.filepath) // Забираем сгенерированное имя файла
            };
            filesList.push(newFile);
            ctx.response.body = newFile;
        } else {
            ctx.response.status = 400;
        }
        return;
    }

    // DELETE /files/<id> - Удалить картинку
    if (method === 'DELETE' && url.startsWith('/files/')) {
        const id = url.split('/')[2];
        const fileIndex = filesList.findIndex(f => f.id === id);

        if (fileIndex !== -1) {
            // Удаляем файл физически с диска
            const filePath = path.join(publicDir, filesList[fileIndex].path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // Удаляем из базы данных
            filesList.splice(fileIndex, 1);
        }
        ctx.response.status = 204;
        return;
    }
});

app.listen(7070, () => {
    console.log('🚀 Сервер для картинок запущен на http://localhost:7070');
});