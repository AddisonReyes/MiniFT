from django.urls import path
from . import views

urlpatterns = [
    path('entries/',            views.entries_view,   name='entries'),       
    path('entries/<int:pk>/',   views.entry_detail,   name='entry-detail'),  
    path('entries/summary/',    views.summary_view,   name='summary'),       
]