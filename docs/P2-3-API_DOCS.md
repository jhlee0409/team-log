# P2-3: API 문서화

> Swagger/OpenAPI 자동 문서 생성

## 🎯 목표

**예상 기간**: 3-5일
**예상 점수 개선**: 문서화 8/10 → 10/10

---

## 📝 구현 플랜

### Phase 1: Swagger 설정

```bash
npm install @nestjs/swagger
```

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('TeamLog API')
    .setDescription('Real-time team collaboration API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

### Phase 2: DTO 문서화

```typescript
// create-workspace.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Workspace name',
    example: 'My Team Workspace',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
```

### Phase 3: 엔드포인트 문서화

```typescript
// workspace.controller.ts
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspaceController {
  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateWorkspaceDto) {
    // ...
  }
}
```

---

## ✅ 검증 체크리스트

- [ ] /api 문서 페이지 접근 가능
- [ ] 모든 엔드포인트 문서화
- [ ] 예제 요청/응답 추가
- [ ] Try it out 기능 동작

---

*문서화 완료!*
