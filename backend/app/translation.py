from modeltranslation.translator import register, TranslationOptions
from .models import Quarter, Rule, Subject, Student

@register(Quarter)
class QuarterTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Rule)
class RuleTranslationOptions(TranslationOptions):
    fields = ('title',)

@register(Subject)
class SubjectTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Student)
class StudentTranslationOptions(TranslationOptions):
    fields = ('first_name', 'last_name')
