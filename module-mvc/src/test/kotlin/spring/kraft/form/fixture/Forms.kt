package spring.kraft.form.fixture

import jakarta.validation.constraints.NotBlank
import spring.kraft.form.UpdateForm

data class TestCreateForm(
    @field:NotBlank val name: String,
)

data class TestCreateForm1(
    @field:NotBlank val name: String,
    val parentId: Long,
)

data class TestCreateForm2(
    @field:NotBlank val name: String,
    val parentId1: Long,
    val parentId2: String,
)

data class TestCreateForm3(
    @field:NotBlank val name: String,
    val parentId1: Long,
    val parentId2: String,
    val parentId3: Long,
)

data class TestCreateForm4(
    @field:NotBlank val name: String,
    val parentId1: Long,
    val parentId2: String,
    val parentId3: Long,
    val parentId4: Long,
)

data class TestUpdateForm(
    override val id: Long,
    @field:NotBlank val name: String,
) : UpdateForm<Long>

data class TestUpdateForm1(
    override val id: Long,
    @field:NotBlank val name: String,
    val parentId: Long?,
) : UpdateForm<Long>

data class TestUpdateForm2(
    override val id: Long,
    @field:NotBlank val name: String,
    val parentId1: Long?,
    val parentId2: String?,
) : UpdateForm<Long>

data class TestUpdateForm3(
    override val id: Long,
    @field:NotBlank val name: String,
    val parentId1: Long?,
    val parentId2: String?,
    val parentId3: Long?,
) : UpdateForm<Long>

data class TestUpdateForm4(
    override val id: Long,
    @field:NotBlank val name: String,
    val parentId1: Long?,
    val parentId2: String?,
    val parentId3: Long?,
    val parentId4: Long?,
) : UpdateForm<Long>
