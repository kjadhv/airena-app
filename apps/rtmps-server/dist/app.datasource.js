"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_entity_1 = require("./stream/stream.entity");
const path_1 = require("path");
const typeorm_1 = require("@nestjs/typeorm");
typeorm_1.TypeOrmModule.forRoot({
    type: 'sqlite',
    database: (0, path_1.join)(__dirname, 'src/data/streaming.db'),
    entities: [stream_entity_1.Stream],
    synchronize: true,
});
//# sourceMappingURL=app.datasource.js.map