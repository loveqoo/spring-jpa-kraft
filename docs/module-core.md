# module-core 설계

**Result 확장 함수** (`spring.kraft.core.ResultExtensions`):
- `flatMap`: 성공 시 변환 함수 적용, 실패 시 원본 실패 전파
- `zip` (2~5인자): 여러 `Result`를 조합. 인자가 호출 전에 모두 평가됨 (eager). 하나라도 실패하면 해당 실패 전파
- `zipLazy` (2~5인자): `zip`과 동일 조합 로직이지만 인자를 `() -> Result<U>` 람다로 받아 lazy evaluation 보장. 앞 단계 실패 시 뒤 람다 미실행
- 프레임워크 의존성 없는 순수 Kotlin 코드
